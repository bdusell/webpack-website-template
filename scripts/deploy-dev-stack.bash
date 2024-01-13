set -e
set -u
set -o pipefail

. scripts/variables.bash

(cd server && bash scripts/build-dev-image.bash)
APP_NAME="$APP_NAME" DEV_STACK_PORT="$DEV_STACK_PORT" \
  docker stack deploy --prune -c docker-compose-dev.yml "$DEV_STACK"
