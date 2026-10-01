#!/usr/bin/env bash
set -euo pipefail

readonly region="us-east-2"
readonly registry="445567071188.dkr.ecr.us-east-2.amazonaws.com"
readonly image="${registry}/kadris-hr:uat"
readonly container="kadris-hr"
readonly env_file="/opt/kadris-hr/.env"

aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry"
docker pull "$image"

previous_image="$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null || true)"
docker run --rm --env-file "$env_file" "$image" pnpm exec prisma migrate deploy
docker rm -f "$container" 2>/dev/null || true
docker run -d --name "$container" --restart unless-stopped --env-file "$env_file" -p 80:3000 "$image"

healthy=false
for _ in $(seq 1 20); do
  if curl --fail --silent --max-time 3 http://127.0.0.1/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 2
done

if [ "$healthy" != "true" ]; then
  docker logs --tail 100 "$container" || true
  docker rm -f "$container" || true
  if [ -n "$previous_image" ]; then
    docker run -d --name "$container" --restart unless-stopped --env-file "$env_file" -p 80:3000 "$previous_image"
  fi
  echo "UAT health check failed; previous image restored." >&2
  exit 1
fi

docker image prune -f >/dev/null
echo "UAT deployment completed successfully."
