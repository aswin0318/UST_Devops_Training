# Kubernetes Scheduling Walkthrough

This repository demonstrates Kubernetes scheduling concepts with a clear separation of theory and hands-on practice.

---

## Topics Covered

- NodeSelector
- Node Affinity (required & preferred)
- Operators (In, NotIn, Exists, DoesNotExist, Gt, Lt)
- AND vs OR behavior
- Taints & tolerations interaction
- Scheduling failures (Pending pods)
- Pod Anti-Affinity

---

## How to Use This Repository

- Refer **Scenarios.md** → for concept-wise explanation of each scenario  
- Refer **Runthrough.md** → for step-by-step execution (YAML + commands)

👉 Recommended flow:

1. Read concept from `Scenarios.md`  
2. Execute using `Runthrough.md`  
3. Observe behavior using `kubectl get pods` and `kubectl describe`

---

## 1. NodeSelector

Definition:  
Simple scheduling method using exact label matching.

Key Points:
- Works only with exact key-value match
- No support for OR, NOT, or advanced logic

Behavior:
- Pod schedules only if node label matches exactly
- Otherwise → Pod remains Pending

---

## 2. Multiple Labels (AND Condition)

Definition:  
All labels must match for scheduling.

Key Points:
- Multiple labels = logical AND
- No partial match allowed

---

## 3. Taints and Tolerations

Definition:  
Taints repel pods from nodes unless tolerated.

Key Points:
- `NoSchedule` → prevents pod placement
- Tolerations allow pods to bypass taints

Behavior:
- Pod will not schedule on tainted node unless tolerated

---

## 4. Node Affinity

Definition:  
Advanced version of nodeSelector with logical operators.

---

### 4.1 Required Affinity (Hard Rule)

Definition:  
Mandatory condition for scheduling.

Key Points:
- If condition not satisfied → Pod stays Pending

---

### 4.2 Preferred Affinity (Soft Rule)

Definition:  
Scheduler preference, not mandatory.

Key Points:
- Pod will still be scheduled even if rule not matched

---

### 4.3 Scoring Mechanism

Definition:  
Scheduler assigns weights to preferred rules.

Key Points:
- Node with highest score is selected
- Tie → non-deterministic selection

---

## 5. Operators

### Exists  
Key must be present

### DoesNotExist  
Key must NOT be present

### In  
Value must match one from list

### NotIn  
Value must NOT match list

### Gt  
Numeric value greater than given value

### Lt  
Numeric value less than given value

---

## 6. OR vs AND Logic

### OR Logic

Definition:  
Multiple `nodeSelectorTerms`

Key Point:
- Any one condition satisfied → scheduling allowed

---

### AND Logic

Definition:  
Multiple `matchExpressions` inside a term

Key Point:
- All conditions must be satisfied

---

## 7. Pod Anti-Affinity

Definition:  
Prevents pods with same label from being scheduled together.

Key Points:
- Works on **pod labels**, not node labels
- Used for high availability and distribution

---

### 7.1 Required Anti-Affinity

- Strict rule
- Can cause Pending pods

---

### 7.2 Preferred Anti-Affinity

- Soft rule
- Never blocks scheduling

---

## 8. Failure Debugging

Use:

```bash
kubectl describe pod <pod-name>
```

Common Reasons:
- Label mismatch
- Affinity rules not satisfied
- Anti-affinity restrictions
- Untolerated taints

---

## 9. Key Takeaways

- nodeSelector → simple exact match  
- nodeAffinity → advanced logic-based scheduling  
- podAntiAffinity → prevents co-location  
- taints → repel pods  
- tolerations → allow scheduling  

Important:

- matchExpressions → AND  
- nodeSelectorTerms → OR  
- preferred rules → scoring-based  

---

## 10. Interview Tips

- Always explain Pending pods  
- Always use `kubectl describe`  
- Clearly differentiate AND vs OR  
- Explain scoring and tie-breaking  
- Highlight node vs pod label difference  

---

## 11. Conclusion

This repository provides:

- Clear conceptual understanding → `Scenarios.md`  
- Hands-on execution → `Runthrough.md`  

Together, they help in:

- Deep understanding of Kubernetes scheduling  
- Real-world debugging  
- Interview preparation  
