# StateBoard Helm chart

Chart `1.1.0` deploys StateBoard `2026.10.0`, with OIDC sign-in, Postgres, persistent media, and release reviews. The image defaults to `ghcr.io/saschb2b/stateboard:2026.10.0`.

## Configure the deployment

Copy the relevant settings from [values.yaml](./values.yaml) into a private values file. Configure `auth.baseUrl`, the OIDC issuer and client, and a session secret. Existing Kubernetes Secrets are supported through `auth.existingSecret` and `externalDatabaseUrlExistingSecret`.

Register `<auth.baseUrl>/api/auth/callback/keycloak` as a valid redirect URI in your identity provider. Terminate HTTPS at your ingress or reverse proxy.

The chart bundles Postgres by default. Set `postgresql.enabled=false` and configure an external database to use an existing server. Replace the example database password before installation. Keep secrets out of Git and shell history.

## First installation

The migration hook runs before ordinary chart resources exist. Bootstrap those resources first, with application replicas and migration disabled:

```bash
helm dependency build deploy/helm/stateboard
helm install stateboard ./deploy/helm/stateboard \
  --namespace stateboard --create-namespace \
  --values stateboard-values.yaml \
  --set replicaCount=0 --set migrate.enabled=false --wait
```

Confirm that Postgres is accepting connections. Then run the migration hook and start the application:

```bash
helm upgrade stateboard ./deploy/helm/stateboard \
  --namespace stateboard \
  --values stateboard-values.yaml \
  --set replicaCount=1 --set migrate.enabled=true --wait
```

This sequence also creates the chart's service account before the migration Job uses it. Use it for both bundled and external databases on a new installation.

## Upgrade to 2026.10.0

1. Back up Postgres and the application media volume.
2. Change the identity provider callback from `/api/auth/oauth2/callback/keycloak` to `/api/auth/callback/keycloak`.
3. Run `helm dependency build deploy/helm/stateboard`.
4. Upgrade with your private values file and `migrate.enabled=true`.
5. Verify sign-in, an existing board, and a release review.

The pre-upgrade Job applies pending SQL migrations, including `0008` through `0010` for release readiness. If migrations run outside Helm, disable the hook and complete them before serving the new image.

## Storage and replicas

Postgres stores product records, evidence, decisions, and history. The application volume stores `uploads` and private `release-assets`. Back up both the database and media. A volume snapshot alone is insufficient.

The default media volume is 10 GiB with `ReadWriteOnce`. Multiple replicas require shared `ReadWriteMany` storage. S3 storage remains deferred. Existing board uploads retain their public image behavior; confidential release evidence uses private media routes.

## Key settings

| Setting                     | Default           | Purpose                                                                        |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `image.tag`                 | Chart app version | Pin the application image.                                                     |
| `replicaCount`              | `1`               | Application replicas. Use `0` for initial bootstrap.                           |
| `postgresql.enabled`        | `true`            | Use the bundled database.                                                      |
| `persistence.size`          | `10Gi`            | Application media capacity.                                                    |
| `persistence.existingClaim` | Empty             | Use a volume claim managed separately.                                         |
| `persistence.accessMode`    | `ReadWriteOnce`   | Use `ReadWriteMany` for multiple replicas.                                     |
| `migrate.enabled`           | `true`            | Run migrations before installation or upgrade.                                 |
| `auth.existingSecret`       | Empty             | Read authentication settings from an existing Secret.                          |
| `caCert`                    | Empty             | Trust your identity provider's internal CA without disabling TLS verification. |
| `ingress.enabled`           | `false`           | Expose the service through your ingress controller.                            |

See [values.yaml](./values.yaml) for all settings and [repository verification](../../../docs/engineering/verification.md) for Helm validation. No cluster deployment is required for the lint and manifest checks.
