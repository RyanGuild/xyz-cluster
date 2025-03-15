#!/bin/bash
set -e

# Check if required commands are available
command -v kubectl >/dev/null 2>&1 || { echo >&2 "kubectl is required but not installed. Aborting."; exit 1; }
command -v helm >/dev/null 2>&1 || { echo >&2 "helm is required but not installed. Aborting."; exit 1; }
command -v argocd >/dev/null 2>&1 || { echo >&2 "argocd CLI is required but not installed. Aborting."; exit 1; }


REPO_URL=${1:-"https://github.com/xyz-cluster/xyz-cluster.git"}
APP_NAME=${2:-"xyz-cluster"}
APP_PATH=${3:-"."}
DEST_NAMESPACE=${4:-"default"}
DEST_SERVER=${5:-"https://kubernetes.default.svc"}

echo "Adding Argo Helm repository..."
helm repo add argo https://argoproj.github.io/argo-helm --force-update
helm repo update

echo "Creating 'argocd' namespace (if it doesn't already exist)..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

echo "Installing ArgoCD using Helm..."
if helm status argo-cd --namespace argocd > /dev/null 2>&1; then
    echo "ArgoCD Helm release 'argo-cd' already exists; skipping installation."
else
    helm install argo-cd argo/argo-cd --namespace argocd --wait
fi

echo "Waiting for the argocd-server deployment to become ready..."
kubectl rollout status deployment/argo-cd-argocd-server -n argocd

# Attempt to determine an external ArgoCD server address from the LoadBalancer service
ARGOCD_SERVER=$(kubectl get svc argo-cd-argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -z "$ARGOCD_SERVER" ]; then
    ARGOCD_SERVER=$(kubectl get svc argo-cd-argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
fi

if [ -z "$ARGOCD_SERVER" ]; then
    echo "No external ArgoCD server address found; setting up a port-forward to localhost."
    # Start port-forwarding the argocd-server service to local port 8080 in the background.
    kubectl port-forward svc/argo-cd-argocd-server -n argocd 8080:443 &
    # Give port-forward a few seconds to establish
    sleep 5
    ARGOCD_SERVER="localhost:8080"
fi

echo "Creating ArgoCD application '$APP_NAME'..."
argocd --core app create "$APP_NAME" \
  --repo "$REPO_URL" \
  --path "$APP_PATH" \
  --dest-server "$DEST_SERVER" \
  --dest-namespace "$DEST_NAMESPACE"

echo "Synchronizing the application '$APP_NAME'..."
argocd app sync "$APP_NAME"

echo "Bootstrap complete! ArgoCD application '$APP_NAME' has been created and synchronized."
