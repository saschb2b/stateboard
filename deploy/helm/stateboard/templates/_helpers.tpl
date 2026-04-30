{{/*
Chart name (sanitized to DNS-1123, ≤63 chars).
*/}}
{{- define "stateboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Fully-qualified resource name. Honors fullnameOverride; otherwise derives
from release + chart name.
*/}}
{{- define "stateboard.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Chart-name + version label, used on every resource.
*/}}
{{- define "stateboard.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Selector labels — the stable subset that appears on Deployment.spec.selector
(immutable across upgrades).
*/}}
{{- define "stateboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "stateboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Full label set, including version + managed-by + commonLabels.
Use on metadata.labels of every resource.
*/}}
{{- define "stateboard.labels" -}}
helm.sh/chart: {{ include "stateboard.chart" . }}
{{ include "stateboard.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: stateboard
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{/*
ServiceAccount name to mount onto pods.
*/}}
{{- define "stateboard.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "stateboard.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
PVC name — uses existingClaim if provided.
*/}}
{{- define "stateboard.pvcName" -}}
{{- if .Values.persistence.existingClaim -}}
{{- .Values.persistence.existingClaim -}}
{{- else -}}
{{- printf "%s-data" (include "stateboard.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Resolved container image reference.
*/}}
{{- define "stateboard.image" -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end -}}
