#!/bin/bash

kubectl apply -f <(echo '
apiVersion: v1
kind: Secret
metadata:
  name: openai-secret
  namespace: bushfire-plan
type: Opaque
stringData:
  api-key: <Open API key>
')
