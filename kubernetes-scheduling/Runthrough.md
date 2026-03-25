# Kubernetes Scheduling Runthrough

This document provides step-by-step execution for each scenario.

---

## Setup

Create namespace:

```bash
kubectl create namespace scheduling-demo
```

Check nodes:

```bash
kubectl get nodes
```

Remove taint in master node (Only if using MASTER-NODE as 3rd node)

```bash
kubectl taint nodes master node-role.kubernetes.io/control-plane:NoSchedule-
```

---

## Label Nodes

```bash
kubectl label node ip-172-31-15-1 env=prod
kubectl label node ip-172-31-8-107 env=dev
kubectl label node master gpu=true
kubectl label node master disk=ssd

kubectl label node ip-172-31-15-1 generation=3
kubectl label node ip-172-31-8-107 generation=1
```

Verify:

```bash
kubectl get nodes --show-labels
```

# SCENARIO 1: NodeSelector Success

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ns-basic
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  nodeSelector:
    env: prod
```

## Apply

```bash
kubectl apply -f ns-basic.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 2: NodeSelector Failure

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ns-basic2
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  nodeSelector:
    env: staging
```

## Apply

```bash
kubectl apply -f ns-basic2.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 3: NodeSelector AND

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ns-basic3
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  nodeSelector:
    gpu: "true"
    disk: ssd
```

## Apply

```bash
kubectl apply -f ns-basic3.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 4: Node Affinity Required

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-required
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: env
            operator: In
            values:
            - prod
```

## Apply

```bash
kubectl apply -f affinity-required.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 5: Node Affinity Failure

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-required2
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: env
            operator: In
            values:
            - staging
```

## Apply

```bash
kubectl apply -f affinity-required2.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 6: Preferred Affinity

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-preferred
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 10
        preference:
          matchExpressions:
          - key: env
            operator: In
            values:
            - prod
```

## Apply

```bash
kubectl apply -f affinity-preferred.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 7: Preferred Multi

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-preferred-multi
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 50
        preference:
          matchExpressions:
          - key: env
            operator: In
            values:
            - prod
      - weight: 30
        preference:
          matchExpressions:
          - key: disk
            operator: In
            values:
            - ssd
      - weight: 20
        preference:
          matchExpressions:
          - key: gpu
            operator: In
            values:
            - "true"
```

## Apply

```bash
kubectl apply -f affinity-preferred-multi.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 8: Exists

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-exists
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: gpu
            operator: Exists
```

## Apply

```bash
kubectl apply -f affinity-exists.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 9: NotIn

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-notin
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: env
            operator: NotIn
            values:
            - dev
```

## Apply

```bash
kubectl apply -f affinity-notin.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 10: DoesNotExist

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-doesnotexist
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: gpu
            operator: DoesNotExist
```

## Apply

```bash
kubectl apply -f affinity-doesnotexist.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 11: Gt

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-gt
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: cpu
            operator: Gt
            values:
            - "2"
```

## Apply

```bash
kubectl apply -f affinity-gt.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 12: Lt

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-lt
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: cpu
            operator: Lt
            values:
            - "10"
```

## Apply

```bash
kubectl apply -f affinity-lt.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 13: OR Logic

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-or
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: env
            operator: In
            values:
            - prod
        - matchExpressions:
          - key: env
            operator: In
            values:
            - dev
```

## Apply

```bash
kubectl apply -f affinity-or.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 14: AND Logic

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: affinity-and
  namespace: scheduling-demo
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: gpu
            operator: Exists
          - key: disk
            operator: In
            values:
            - ssd
```

## Apply

```bash
kubectl apply -f affinity-and.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 15: Anti-Affinity Required

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: anti-affinity-demo
  namespace: scheduling-demo
  labels:
    app: nginx-aa
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: nginx-aa
        topologyKey: kubernetes.io/hostname
```

## Apply

```bash
kubectl apply -f anti-affinity-demo.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 16: Anti-Affinity Multiple Pods

Repeat with new names:

```bash
kubectl apply -f anti-affinity-demo2.yaml
kubectl apply -f anti-affinity-demo3.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# SCENARIO 17: Anti-Affinity Failure

Deploy extra pod:

```bash
kubectl apply -f anti-affinity-demo4.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

Expected:

* Pod → Pending

---

# SCENARIO 18: Anti-Affinity Preferred

## YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: anti-affinity-soft
  namespace: scheduling-demo
  labels:
    app: nginx-soft
spec:
  containers:
  - name: nginx
    image: nginx
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: nginx-soft
          topologyKey: kubernetes.io/hostname
```

## Apply

```bash
kubectl apply -f anti-affinity-soft.yaml
```

## Verify

```bash
kubectl get pods -o wide -n scheduling-demo
```

---

# END

This runthrough covers all scheduling scenarios step-by-step.
