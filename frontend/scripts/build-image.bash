set -e
set -u
set -o pipefail
. scripts/variables.bash
bash scripts/build-dev-image.bash "$@"
DOCKER_BUILDKIT=1 docker build "$@" -t "$IMAGE":latest --build-arg=DEV_IMAGE="$DEV_IMAGE" .
