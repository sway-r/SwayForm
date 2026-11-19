# Streams Gazebo's own physics state (joints, object poses, real-time factor) to the orchestrator over one WebSocket.
# Reads gz-transport directly, not ROS topics, so student code publishing on ROS can never change what the viewer shows.

import asyncio
import hmac
import json
import os
import threading

import websockets
from gz.transport13 import Node
from gz.msgs10.model_pb2 import Model
from gz.msgs10.pose_v_pb2 import Pose_V
from gz.msgs10.world_stats_pb2 import WorldStatistics

TOKEN = os.environ["SWAYFORM_GATEWAY_TOKEN"]
PORT = int(os.environ.get("SWAYFORM_GATEWAY_PORT", "8765"))
WORLD = os.environ["SWAYFORM_WORLD"]
ROBOT_MODEL = os.environ["SWAYFORM_ROBOT_MODEL"]
TRACKED = {n for n in os.environ.get("SWAYFORM_TRACKED_MODELS", "").split(",") if n}
FRAME_HZ = 20
STATS_HZ = 2

_lock = threading.Lock()
_latest = {"joints": None, "poses": None, "stats": None}


def _sim_seconds(stamp):
    return stamp.sec + stamp.nsec / 1e9


def _on_joints(msg: Model):
    frame = {"type": "joints", "t": _sim_seconds(msg.header.stamp), "name": [], "position": [], "velocity": [], "effort": []}
    for j in msg.joint:
        frame["name"].append(j.name)
        frame["position"].append(j.axis1.position)
        frame["velocity"].append(j.axis1.velocity)
        frame["effort"].append(j.axis1.force)
    with _lock:
        _latest["joints"] = frame


def _on_poses(msg: Pose_V):
    if not TRACKED:
        return
    models = []
    for p in msg.pose:
        if p.name in TRACKED:
            models.append({"name": p.name, "p": [p.position.x, p.position.y, p.position.z],
                           "q": [p.orientation.x, p.orientation.y, p.orientation.z, p.orientation.w]})
    with _lock:
        _latest["poses"] = {"type": "poses", "t": _sim_seconds(msg.header.stamp), "models": models}


def _on_stats(msg: WorldStatistics):
    with _lock:
        _latest["stats"] = {"type": "stats", "rtf": msg.real_time_factor, "simTime": _sim_seconds(msg.sim_time), "paused": msg.paused}


def _take(key):
    with _lock:
        value = _latest[key]
        _latest[key] = None
    return value


_client = None


async def _serve(ws):
    global _client
    try:
        hello = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
    except Exception:
        await ws.close(4001, "hello_required")
        return
    if hello.get("type") != "hello" or not hmac.compare_digest(str(hello.get("token", "")), TOKEN):
        await ws.close(4003, "bad_token")
        return
    if _client is not None:
        await _client.close(4000, "replaced")
    _client = ws
    try:
        await ws.wait_closed()
    finally:
        if _client is ws:
            _client = None


async def _pump():
    ready_sent = set()
    tick = 0
    while True:
        await asyncio.sleep(1 / FRAME_HZ)
        tick += 1
        ws = _client
        if ws is None:
            continue
        frames = [_take("joints"), _take("poses")]
        if tick % (FRAME_HZ // STATS_HZ) == 0:
            frames.append(_take("stats"))
        try:
            if id(ws) not in ready_sent and frames[0] is not None:
                await ws.send(json.dumps({"type": "ready", "world": WORLD, "model": ROBOT_MODEL}))
                ready_sent.add(id(ws))
            if id(ws) not in ready_sent:
                continue
            for f in frames:
                if f is not None:
                    await ws.send(json.dumps(f))
        except websockets.ConnectionClosed:
            continue


async def main():
    node = Node()
    node.subscribe(Model, f"/world/{WORLD}/model/{ROBOT_MODEL}/joint_state", _on_joints)
    node.subscribe(Pose_V, f"/world/{WORLD}/dynamic_pose/info", _on_poses)
    node.subscribe(WorldStatistics, f"/world/{WORLD}/stats", _on_stats)
    async with websockets.serve(_serve, "0.0.0.0", PORT, max_size=64 * 1024):
        await _pump()


if __name__ == "__main__":
    asyncio.run(main())
