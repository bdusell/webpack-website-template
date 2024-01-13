set -e
set -u
set -o pipefail

. scripts/variables.bash

(cd server && bash scripts/build-image.bash)
APP_NAME="$APP_NAME" TEST_STACK_PORT="$TEST_STACK_PORT" \
  docker stack deploy --prune -c docker-compose-test.yml "$TEST_STACK"
