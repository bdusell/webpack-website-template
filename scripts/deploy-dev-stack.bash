set -e
set -u
set -o pipefail

. scripts/dockerdev.bash
. scripts/variables.bash
. server/scripts/variables.bash

(cd server && bash scripts/build-dev-image.bash)
APP_NAME="$APP_NAME" DEV_STACK_PORT="$DEV_STACK_PORT" \
  dockerdev_ensure_stack_container_ready \
    docker-compose-dev.yml \
    "$APP_NAME"-dev \
    server \
    "$DEV_IMAGE":latest
