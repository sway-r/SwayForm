# Temporary test script for the real Pi — stands in for the real agent
# (which will eventually live in the sway-r/swayform_ws repo) just enough to
# prove the bridge <-> API <-> portal wiring works end to end. Delete once
# the real agent exists.
#
# Needs: pip install websockets
#
# Usage: python3 fake-agent.py <ws-url> <token> <serial>
#   e.g. python3 fake-agent.py ws://10.0.0.85:9000/agent abcd1234 robot005

import asyncio
import json
import sys

import websockets


async def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "ws://localhost:9000/agent"
    token = sys.argv[2] if len(sys.argv) > 2 else "test-token"
    serial = sys.argv[3] if len(sys.argv) > 3 else "robot005"

    print(f"connecting to {url} as serial={serial} ...")
    async with websockets.connect(url) as ws:
        print("connected — sending hello")
        await ws.send(json.dumps({
            "t": "hello",
            "token": token,
            "serial": serial,
            "agentVersion": "fake-agent-py-0.0.1",
        }))

        try:
            async for raw in ws:
                print("recv:", raw)
        except websockets.ConnectionClosed as e:
            print(f"closed {e.code} {e.reason}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
