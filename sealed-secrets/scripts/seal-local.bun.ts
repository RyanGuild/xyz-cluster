#!bun
import { $ } from "bun";
import path from "node:path";
import process from "node:process";

// Get the first argument from the command line
const targetFolder = process.argv[2] ||
    path.join(import.meta.dirname, '..', "local");
const outputFolder = process.argv[3] ||
    path.join(import.meta.dirname, '..', "generated");

await $`rm -rf ${outputFolder}`;
await $`mkdir -p ${outputFolder}`;

console.log({ targetFolder, outputFolder });

const localSecrets = (await Array.fromAsync($`ls -l ${targetFolder}`.lines()))
    .map((a) => a.split(" ").pop())

const rawFiles = localSecrets.filter((a) => !a?.endsWith(".yaml"))
const manifestFiles = localSecrets.filter((a) => a?.endsWith(".yaml"))

console.log({
    localSecrets,
    rawFiles,
    manifestFiles
})

for (const secretName of rawFiles) {
    if (!secretName) continue;
    const secretPath = path.join(targetFolder, secretName);
    const sealedSecretPath = path.join(
        outputFolder,
        `${secretName}-sealed.yaml`,
    );
    console.log({ secretName, secretPath, sealedSecretPath });
    await $`kubectl create secret generic ${secretName} --dry-run=client --from-file=${secretPath} -o yaml | kubeseal --controller-namespace=default --namespace=default  > ${sealedSecretPath}`;

    console.log(`Sealing secret ${secretName}...`);
}

for (const secretFile of manifestFiles) {
    if (!secretFile) continue;
    const secretName = secretFile.split(".yaml")[0]
    const secretPath = path.join(targetFolder, secretFile);
    const sealedSecretPath = path.join(
        outputFolder,
        `${secretName}-sealed.yaml`,
    );
    console.log({ secretName, secretPath, sealedSecretPath })
    await $`cat ${secretPath} | kubeseal --controller-namespace=default --namespace=default > ${sealedSecretPath} `
    console.log(`Sealing secret ${secretName}...`);
}
