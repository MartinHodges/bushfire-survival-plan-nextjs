#!/bin/bash

kubectl apply -f <(echo '
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: bushfire-plan
type: Opaque
stringData:
  redis-pw: <redis password>
')
