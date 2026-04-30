# StateBoard Helm chart

Kubernetes deployment for [StateBoard](../../../README.md) — status reporting for visual products.

## TL;DR

```bash
helm install stateboard ./deploy/helm/stateboard \
  --namespace stateboard --create-namespace \
  --set image.repository=ghcr.io/saschb2b/stateboard \
  --set image.tag=0.1.0
```

Then port-forward and open it:

```bash
kubectl -n stateboard port-forward svc/stateboard 3000:80
open http://localhost:3000
```

## Scope (v0)

The chart matches v0 of StateBoard:

- **Single replica.** SQLite on a `ReadWriteOnce` PVC means there is exactly one writer. The chart will refuse to render if `replicaCount > 1`.
- **One PVC** mounted at `/data`. Holds both the SQLite database (`db/stateboard.db`) and the uploaded screenshots (`uploads/`). **Back this up** — losing it loses every board.
- **No auth, no ingress by default.** v0 lives behind your VPN or a `kubectl port-forward`. Enable the bundled ingress only after you've put auth in front of it (e.g. an oauth2-proxy sidecar via `extraContainers`).
- **Recreate strategy.** RollingUpdate would briefly run two pods sharing the volume, which corrupts SQLite. Don't change this until the chart supports Postgres.
- **No outbound calls.** Telemetry is off; the app does not phone home. The chart is safe to run in airgapped clusters.

## Values reference

| Key                                   | Default                        | Notes                                                   |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `image.repository`                    | `ghcr.io/saschb2b/stateboard`  | Override to your registry mirror in airgapped clusters. |
| `image.tag`                           | `""` (uses `Chart.AppVersion`) | Pin this in production.                                 |
| `replicaCount`                        | `1`                            | **Do not change.** Hard-blocked above 1 in v0.          |
| `persistence.enabled`                 | `true`                         | Set `false` only for ephemeral demos.                   |
| `persistence.size`                    | `5Gi`                          | Each screenshot is ~0.5–2 MB; 5 GiB holds thousands.    |
| `persistence.storageClass`            | `""`                           | `""` = cluster default; `"-"` = none.                   |
| `persistence.existingClaim`           | `""`                           | Mount a PVC managed elsewhere instead of creating one.  |
| `service.type`                        | `ClusterIP`                    | Use `LoadBalancer` only behind auth.                    |
| `service.port` / `service.targetPort` | `80` / `3000`                  | The container always listens on 3000.                   |
| `ingress.enabled`                     | `false`                        | See above re: auth.                                     |
| `resources`                           | 50m/128Mi → 500m/512Mi         | Idle StateBoard is tiny; bump for large boards.         |
| `strategy.type`                       | `Recreate`                     | **Do not change** while on SQLite.                      |
| `extraEnv`                            | `[]`                           | Inject extra env vars (e.g. for v1 OIDC config).        |
| `extraContainers`                     | `[]`                           | Sidecars (oauth2-proxy, log shippers).                  |
| `podSecurityContext`                  | runs as UID 1000 (`node`)      | Matches the Dockerfile.                                 |

Full schema lives in `values.yaml`.

## Verifying without a cluster

```bash
helm lint deploy/helm/stateboard
helm template stateboard deploy/helm/stateboard | kubectl apply --dry-run=client -f -
```

## Backups

Everything that matters is on the PVC. A nightly snapshot of the volume (Velero, CSI snapshot, or a sidecar that `tar`s `/data` to your object store) is enough.

## Why no chart for v1+ yet

`replicaCount > 1`, Postgres, and S3 are all real concerns and they will land in a follow-up chart version when StateBoard itself supports them. Until then, the explicit guardrail (`fail` on `replicaCount > 1`) is on purpose: it is much better to fail at `helm install` than to discover SQLite corruption at 3am.
