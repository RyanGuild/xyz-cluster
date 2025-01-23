import {$} from "bun"
await $`kubectl port-forward svc/argocd-server -n default 8080:80`