set -e
set -u
set -o pipefail

. ../scripts/dockerdev.bash
. scripts/variables.bash

port=$DEV_PORT
bash scripts/build-dev-image.bash
dockerdev_ensure_dev_container_started "$DEV_IMAGE" -- \
  -v "$PWD":/app \
  -e PORT="$port" \
  -p "$port":"$port"
dockerdev_run_in_dev_container "$DEV_IMAGE" bash
