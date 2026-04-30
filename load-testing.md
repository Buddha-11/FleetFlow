# 🚀 Load Testing, Observability, and Scaling Demo

This guide provides instructions to demonstrate Kubernetes orchestration, Horizontal Pod Autoscaling (HPA), and load balancing for the E-Commerce Microservices project.

---

## 🧱 TASK 1: OBSERVABILITY SETUP

### 1. Install Metrics Server
The Metrics Server is required for the Horizontal Pod Autoscaler (HPA) to read CPU/Memory metrics.

Apply the Metrics Server using the official manifest. If you are using **Docker Desktop** for Kubernetes, you must patch the deployment to allow insecure TLS.

```bash
# 1. Download and apply the Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# 2. Patch it to allow insecure TLS (REQUIRED for Docker Desktop / Minikube)
kubectl patch deployment metrics-server -n kube-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

# Verify it's running (Wait a minute for it to start collecting metrics)
kubectl get pods -n kube-system | findstr metrics-server
```

### 2. Install Kubernetes Dashboard
The Kubernetes Dashboard provides a graphical view of your cluster, including CPU usage and Pod scaling.

```bash
# 1. Deploy the dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# 2. Create an admin Service Account and ClusterRoleBinding
kubectl create serviceaccount dashboard-admin -n kubernetes-dashboard
kubectl create clusterrolebinding dashboard-admin --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:dashboard-admin

# 3. Generate a Bearer Token to log in
kubectl create token dashboard-admin -n kubernetes-dashboard

# 4. Start the kubectl proxy (Run this in a separate terminal)
kubectl proxy
```

**Access the Dashboard:**
Open your browser and navigate to:
[http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/](http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/)
*(Use the token generated in step 3 to log in)*

### 3. CLI Observability Commands
You can monitor the cluster directly from your terminal:
```bash
# View all pods and their statuses
kubectl get pods

# View deployments and their current replica count
kubectl get deployments

# View real-time CPU and Memory usage per pod (Requires Metrics Server)
kubectl top pods

# Stream logs for a specific deployment (Useful to see load balancing)
kubectl logs -f deployment/api-gateway
```

---

## 🧱 TASK 2 & 3: HORIZONTAL SCALING & LOAD BALANCING

We have configured a **Horizontal Pod Autoscaler (HPA)** for the `api-gateway` (`k8s/api-gateway-hpa.yaml`). It scales up to 5 pods if the average CPU utilization exceeds 50%.

Additionally, the `api-gateway` has a new `/stress` endpoint to simulate heavy CPU load, and it logs the `HOSTNAME` (Pod ID) handling each request to demonstrate load balancing.

---

## 🎬 TASK 5: DEMO FLOW SCRIPT

Follow these steps to demonstrate the system to your evaluator.

### Step 1: Show Initial State
Show that the API Gateway is currently running with only 1 pod.
```bash
kubectl get pods -l app=api-gateway
kubectl top pods
```

### Step 2: Start the Load Test
We use **k6** to simulate hundreds of virtual users hitting the gateway, registering, placing orders, and triggering the `/stress` CPU load endpoint.

*(Make sure you have [k6 installed](https://k6.io/docs/get-started/installation/))*

Open a new terminal and run:
```bash
k6 run k6-load-test.js
```

### Step 3: Watch the Scaling (HPA in action)
In your main terminal, watch the HPA and Pods scale up as CPU usage spikes.
```bash
# Watch HPA metrics and replica count
kubectl get hpa -w

# OR watch pods being created dynamically
kubectl get pods -w
```
*You will see the replica count increase from 1 up to 5 as the load test continues.*

### Step 4: Show Load Balancing
Wait for multiple pods to be in the `Running` state, then check the logs.
```bash
kubectl logs -f deployment/api-gateway
```
*You will see requests being handled by different Pod IDs (e.g., `Handled by pod: api-gateway-xxx...`), proving that the Kubernetes Service is successfully load-balancing the traffic across the scaled pods.*

### Step 5: Scale Down
Once the k6 test finishes (it takes ~2 minutes), run:
```bash
kubectl get hpa -w
```
*After a few minutes of idle traffic, Kubernetes will automatically terminate the extra pods and scale back down to 1 minimum replica.*
