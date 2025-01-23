#!bun
import { $ } from "bun";

console.log("Checking for kubectl...");
export const kubectlInfo = await $`kubectl version --output json`.json();
if (!kubectlInfo || !kubectlInfo.clientVersion || !kubectlInfo.clientVersion.gitVersion || !kubectlInfo.serverVersion || !kubectlInfo.serverVersion.gitVersion) {
  throw new Error("kubectl not found");
}

if (kubectlInfo.clientVersion.gitVersion !== kubectlInfo.serverVersion.gitVersion) {
  throw new Error(
`kubectl versions do not match!!
Client: ${kubectlInfo.clientVersion.gitVersion}
Server: ${kubectlInfo.serverVersion.gitVersion}`);
}

console.log(kubectlInfo);

console.log("Checking for Helm...");
export const helmVersion = await $`helm version --short`.text();


if (!helmVersion) {
  throw new Error("Helm not found");
}

console.log(helmVersion);

console.log("Checking for Argo Helm Repo...");
export let helmRepos: Array<{ name: string; url: string }> = await $`helm repo list --output json`.json();
const argo = helmRepos.find((repo) => repo.name === "argo");

if (!argo) {
  console.log("Adding Argo CD Helm repository...");
  await $`helm repo add argo https://argoproj.github.io/argo-helm`;
} 
helmRepos = await $`helm repo list --output json`.json() as Array<{ name: string; url: string }>
console.log(helmRepos);


console.log("Checking for Argo CD CLI...");
export let argoVersion = await $`argocd version --core --output json`.json();
if (!argoVersion || !argoVersion?.client?.Version) {
  throw new Error("Argo CD CLI not found");
}
if (!argoVersion?.server) {
  console.log("Installing Argo CD Helm Chart...");
  await $`helm install argocd argo/argo-cd`;
}
argoVersion = await $`argocd version --core --output json`.quiet().json()
console.log(argoVersion);
