import { $, spawn } from "bun";

import "./checkdeps.bun.ts"

console.log("Get Argo CD password...");
export const argoPassword = await $`kubectl -n default get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`.text();
console.log(argoPassword)
console.log("Login to Argo CD...");
await $`argocd login --core --name admin --password ${argoPassword}`


await $`kubectl apply -f ./project.yaml`

await $`kubectl port-forward svc/argocd-server -n default 8080:80`

