#!/bin/bash

kubectl apply -f <(echo '
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: bushfire-plan
type: Opaque
stringData:
  postgres-pw: <postgres pasword>
')
