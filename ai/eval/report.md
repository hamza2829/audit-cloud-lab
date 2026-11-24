# Root cause clustering evaluation

Dataset: 63 labeled synthetic findings, 7 gold root causes.

| threshold | clusters | purity | pair precision | pair recall | pair F1 | ARI |
|---|---|---|---|---|---|---|
| 0.02 | 9 | 0.524 | 0.345 | 0.54 | 0.421 | 0.313 |
| 0.04 | 17 | 0.794 | 0.621 | 0.377 | 0.469 | 0.412 |
| 0.06 | 19 | 0.857 | 0.795 | 0.369 | 0.504 | 0.46 |
| 0.08 | 23 | 0.889 | 0.867 | 0.337 | 0.486 | 0.446 |
| 0.1 | 25 | 0.889 | 0.852 | 0.298 | 0.441 | 0.401 |
| 0.12 | 30 | 0.937 | 0.897 | 0.242 | 0.381 | 0.345 |
| 0.16 | 38 | 0.937 | 0.848 | 0.111 | 0.196 | 0.172 |
| 0.2 | 45 | 0.952 | 0.842 | 0.063 | 0.118 | 0.102 |

Held-out check: threshold tuned on 32 even rows (best 0.12, ARI 0.412), applied to 31 odd rows: purity 0.839, pair F1 0.235, ARI 0.197.

Features: word tokens plus character 4-grams, sublinear TF, smoothed IDF, L2 norm. Clustering: average-linkage agglomerative on cosine similarity.
