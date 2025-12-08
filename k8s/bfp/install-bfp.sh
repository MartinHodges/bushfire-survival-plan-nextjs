#!/bin/bash
set -euo pipefail

echo Installing Bushfire Survival Plan

HERE="$(dirname "$(readlink -f "$0")")"

kubectl apply -f <(echo 'apiVersion: v1
kind: Namespace
metadata:
  name: bushfire-plan')

${HERE}/openai-key.sh
${HERE}/redis-pw.sh
${HERE}/postgres-pw.sh

kubectl apply -f ${HERE}/bfp-api-deploy.yml
kubectl apply -f ${HERE}/bfp-ui-deploy.yml

sleep 5 # wait to start

kubectl rollout status deployment/bfp-app -n bushfire-plan

kubectl apply -f ${HERE}/bfp-sec-route.yml
kubectl apply -f ${HERE}/bfp-oauth-proxy.yml

echo Bushfire Survival Plan installed
echo -e "----\n\n"

