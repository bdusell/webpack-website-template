set -e
set -u
set -o pipefail

. ../scripts/variables.bash
. scripts/variables.bash

(cd ../frontend && bash scripts/build-image.bash "$@")
bash scripts/build-dev-image.bash "$@"
version=$(< VERSION)
registry_image=$REGISTRY/$IMAGE:$version
DOCKER_BUILDKIT=1 docker build "$@" -t "$IMAGE":latest \
  --build-arg=FRONTEND_IMAGE="$APP_NAME"-frontend \
  --build-arg=DEV_IMAGE="$DEV_IMAGE" \
  .
docker tag "$IMAGE":latest "$registry_image"
