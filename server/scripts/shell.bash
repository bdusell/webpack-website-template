set -e
set -u
set -o pipefail

. ../scripts/dockerdev.bash
. scripts/variables.bash

container=$(cd .. && bash scripts/deploy-dev-stack.bash)
dockerdev_run_in_container "$container" bash
