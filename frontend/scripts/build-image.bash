set -e
set -u
. scripts/variables.bash
bash scripts/build-dev-image.bash "$@"
DOCKER_BUILDKIT=1 docker build "$@" -t "$IMAGE":latest .
