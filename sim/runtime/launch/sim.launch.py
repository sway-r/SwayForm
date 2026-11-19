# Headless Gazebo Harmonic + ros2_control for one student session. Every model-specific value comes from the joint contract.

import json
import os

from launch import LaunchDescription
from launch.actions import ExecuteProcess, IncludeLaunchDescription, RegisterEventHandler
from launch.event_handlers import OnProcessExit
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory
import xacro

CONTRACT_PATH = os.environ.get("SWAYFORM_JOINT_CONTRACT", "/opt/swayform/sim/joint-contract.json")
WORLD_PATH = os.environ.get("SWAYFORM_WORLD_FILE", "/opt/swayform/sim/worlds/classroom.sdf")
WRAPPER_PATH = "/opt/swayform/sim/urdf/sim_wrapper.urdf.xacro"
WORLD_NAME = os.environ.get("SWAYFORM_WORLD_NAME", "swayform_classroom")


def _load_contract():
    if not os.path.exists(CONTRACT_PATH):
        raise RuntimeError(f"No joint contract at {CONTRACT_PATH}; the sim image was built without one.")
    with open(CONTRACT_PATH) as f:
        return json.load(f)


def generate_launch_description():
    contract = _load_contract()
    sim = contract["sim"]
    description_share = get_package_share_directory(sim["descriptionPackage"])
    robot_xacro = os.path.join(description_share, sim["xacroFile"])
    controllers_yaml = os.path.join(get_package_share_directory(sim["controllersPackage"]), sim["controllersFile"])

    robot_description = xacro.process_file(WRAPPER_PATH, mappings={
        "robot_xacro": robot_xacro,
        "controllers_yaml": controllers_yaml,
        **{k: str(v) for k, v in sim.get("xacroArgs", {}).items()},
    }).toxml()

    gz = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(get_package_share_directory("ros_gz_sim"), "launch", "gz_sim.launch.py")),
        launch_arguments={"gz_args": f"-s -r -v 2 {WORLD_PATH}", "on_exit_shutdown": "true"}.items(),
    )

    state_publisher = Node(
        package="robot_state_publisher", executable="robot_state_publisher",
        parameters=[{"robot_description": robot_description, "use_sim_time": True}],
    )

    spawn = Node(
        package="ros_gz_sim", executable="create",
        arguments=["-world", WORLD_NAME, "-name", sim["model"], "-topic", "robot_description", *sim.get("spawnArgs", [])],
    )

    clock_bridge = Node(
        package="ros_gz_bridge", executable="parameter_bridge",
        arguments=["/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock"],
    )

    spawners = [
        Node(package="controller_manager", executable="spawner", arguments=[name, "--controller-manager-timeout", "60"])
        for name in sim["controllers"]
    ]

    gateway = ExecuteProcess(
        cmd=["python3", "/opt/swayform/sim/gateway/sim_gateway.py"],
        additional_env={
            "SWAYFORM_WORLD": WORLD_NAME,
            "SWAYFORM_ROBOT_MODEL": sim["model"],
            "SWAYFORM_TRACKED_MODELS": ",".join(sim.get("trackedModels", [])),
        },
        output="screen",
    )

    return LaunchDescription([
        gz, state_publisher, clock_bridge, spawn, gateway,
        RegisterEventHandler(OnProcessExit(target_action=spawn, on_exit=spawners)),
    ])
