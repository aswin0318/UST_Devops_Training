# Kubernetes Scheduling Scenarios

---

## SCENARIO 1: NodeSelector Success

Definition:  
Pod is scheduled when node label matches exactly.

Key Point:  
Exact key-value match required.

Result:  
Pod → Running on `env=prod` node

---

## SCENARIO 2: NodeSelector Failure

Definition:  
Pod remains Pending when no node matches label.

Key Point:  
No fallback logic exists.

Result:  
Pod → Pending

---

## SCENARIO 3: NodeSelector AND Condition

Definition:  
All labels must match.

Key Point:  
Multiple labels = AND condition

Result:  
Pod → Scheduled only on node having BOTH labels

---

## SCENARIO 4: Node Affinity Required (Hard Rule)

Definition:  
Strict scheduling rule using expressions.

Key Point:  
If condition fails → Pod not scheduled

Result:  
Pod → Runs only on matching node

---

## SCENARIO 5: Node Affinity Required Failure

Definition:  
No node satisfies required condition.

Key Point:  
Hard constraint → blocks scheduling

Result:  
Pod → Pending

---

## SCENARIO 6: Node Affinity Preferred (Soft Rule)

Definition:  
Scheduler prefers matching nodes but not mandatory.

Key Point:  
Best effort scheduling

Result:  
Pod → Always runs (even if rule not met)

---

## SCENARIO 7: Node Affinity Preferred Multi (Scoring)

Definition:  
Multiple preferences with weights.

Key Point:  
Scheduler calculates total score.

Result:  
Pod → Scheduled on highest scoring node

---

## SCENARIO 8: Operator Exists

Definition:  
Node must have the key.

Key Point:  
Value is ignored

Result:  
Pod → Runs where key exists

---

## SCENARIO 9: Operator NotIn

Definition:  
Excludes nodes with specific values.

Key Point:  
Negative filtering

Result:  
Pod → Avoids specified nodes

---

## SCENARIO 10: Operator DoesNotExist

Definition:  
Node must NOT contain key.

Key Point:  
Inverse of Exists

Result:  
Pod → Runs on nodes without key

---

## SCENARIO 11: Operator Gt (Greater Than)

Definition:  
Numeric comparison on label value.

Key Point:  
Values treated as numbers (strings)

Result:  
Pod → Runs on nodes with value > given

---

## SCENARIO 12: Operator Lt (Less Than)

Definition:  
Numeric comparison for lower values.

Key Point:  
Useful for capacity-based scheduling

Result:  
Pod → Runs on nodes with value < given

---

## SCENARIO 13: Node Affinity OR Logic

Definition:  
Multiple nodeSelectorTerms act as OR.

Key Point:  
Any one term match is enough

Result:  
Pod → Runs on any matching node

---

## SCENARIO 14: Node Affinity AND Logic

Definition:  
Multiple matchExpressions inside one term.

Key Point:  
All conditions must be satisfied

Result:  
Pod → Runs only if all match

---

## SCENARIO 15: Pod Anti-Affinity Required

Definition:  
Prevents pods from being scheduled together.

Key Point:  
Works on pod labels, not node labels

Result:  
Pods → Spread across nodes

---

## SCENARIO 16: Pod Anti-Affinity Multiple Pods

Definition:  
Each new pod avoids existing matching pods.

Key Point:  
One pod per node (for same label)

Result:  
Pods → Distributed across cluster

---

## SCENARIO 17: Pod Anti-Affinity Failure

Definition:  
More pods than available nodes.

Key Point:  
Strict rule blocks scheduling

Result:  
Extra Pod → Pending

---

## SCENARIO 18: Pod Anti-Affinity Preferred

Definition:  
Soft anti-affinity rule.

Key Point:  
Scheduler tries to spread but doesn’t enforce

Result:  
Pod → Always scheduled

---

## FINAL SUMMARY (IMPORTANT)

nodeSelector → simple exact match  
nodeAffinity → advanced logic-based scheduling  
podAntiAffinity → prevents co-location of similar pods  

Golden Line:  
Affinity attracts pods to nodes  
Anti-affinity repels pods from each other
