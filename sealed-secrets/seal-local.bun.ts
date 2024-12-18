#!bun
import { $ } from "bun";
import path from "node:path";

// Get the first argument from the command line
const targetFolder = process.argv[2] ||
    path.join(import.meta.dirname, "local");
const outputFolder = process.argv[3] ||
    path.join(import.meta.dirname, "generated");

await $`rm -rf ${outputFolder}`;
await $`mkdir -p ${outputFolder}`;

console.log({ targetFolder, outputFolder });

const localSecrets = $`ls -l ${targetFolder}`.lines();

for await (const secret of localSecrets) {
    const secretSplit = secret.split(" ");
    const secretName = secretSplit[secretSplit.length - 1];
    if (!secretName) {
        continue;
    }

    const secretPath = path.join(targetFolder, secretName);
    const sealedSecretPath = path.join(
        outputFolder,
        `${secretName}-sealed.yaml`,
    );
    console.log({ secretName, secretPath, sealedSecretPath });
    const { blob, bytes } =
        await $`kubectl create secret generic ${secretName} --dry-run=client --from-file=${secretPath} -o yaml | kubeseal --controller-namespace=xyz  > ${sealedSecretPath}`;

    console.log(`Sealing secret ${secretName}...`);
}
