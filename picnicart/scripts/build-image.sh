#!/usr/bin/env bash
# Build the Picnic Art production image from a git TAG (not from the working tree).
# Usage: picnicart/scripts/build-image.sh <tag> [--push]
#   picnicart/scripts/build-image.sh v4.17.1-picnic.1          # build and load into local docker
#   picnicart/scripts/build-image.sh v4.17.1-picnic.1 --push   # build and push to Docker Hub
#
# Why a clean clone: the Dockerfile runs `git rev-parse HEAD`, which fails inside a git worktree
# (its .git is a file pointing outside the build context), and a working tree can carry local-only
# files (.env, .agents, ...). Building from a clone of the tag is reproducible. The picnicart/ folder
# (internal docs: hosts, ids) is removed from the context so it never ends up in the public image.
set -euo pipefail

IMAGE="${IMAGE:-andercard/chatwoot}"
PLATFORM="${PLATFORM:-linux/amd64}"
TAG="${1:?usage: $0 <vX.Y.Z-picnic.N> [--push]}"
OUTPUT="--load"
[ "${2:-}" = "--push" ] && OUTPUT="--push"

[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-picnic\.[0-9]+$ ]] || { echo "Tag must look like v4.17.1-picnic.1"; exit 1; }
REPO="$(git rev-parse --show-toplevel)"
git -C "$REPO" rev-parse --verify --quiet "refs/tags/$TAG" >/dev/null || { echo "Git tag $TAG does not exist; create it on the commit to release"; exit 1; }

CTX="$(mktemp -d)"
trap 'rm -rf "$CTX"' EXIT
git clone --quiet --local --branch "$TAG" "file://$REPO" "$CTX/src"
cd "$CTX/src"
COMMIT="$(git rev-parse HEAD)"
rm -rf picnicart

echo "Building $IMAGE:$TAG from commit ${COMMIT:0:10} ($PLATFORM, ${OUTPUT#--})"
docker buildx build \
  --platform "$PLATFORM" \
  -f docker/Dockerfile \
  --label "org.opencontainers.image.source=https://github.com/andercard/chatwoot" \
  --label "org.opencontainers.image.revision=$COMMIT" \
  --label "org.opencontainers.image.version=$TAG" \
  -t "$IMAGE:$TAG" \
  $OUTPUT .

echo "Built $IMAGE:$TAG ${OUTPUT#--}"
