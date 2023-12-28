. "$(dirname "$BASH_SOURCE")"/../../scripts/variables.bash
CONTAINER_NAME=$(basename "$(cd "$(dirname "$BASH_SOURCE")"/.. && pwd)")
IMAGE=$APP_NAME-$CONTAINER_NAME
DEV_IMAGE=$IMAGE-dev
