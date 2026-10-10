"""Esquemas de validación espacial (municipio oficial, píxel como chequeo)."""

from __future__ import annotations

from typing import Iterator

import numpy as np
from sklearn.model_selection import GroupKFold, LeaveOneGroupOut


def iter_group_folds(
    groups: np.ndarray | list,
    *,
    leave_one_group_out: bool = True,
    n_splits: int = 5,
    seed: int = 0,
) -> Iterator[tuple[int, np.ndarray, np.ndarray]]:
    """Yield (fold_id, train_idx, test_idx)."""
    groups = np.asarray(groups)
    if leave_one_group_out:
        cv = LeaveOneGroupOut()
        splitter = cv.split(np.zeros(len(groups)), groups=groups)
    else:
        # GroupKFold no usa random_state; n_splits acotado por n_groups
        n_groups = len(np.unique(groups))
        splits = min(n_splits, n_groups)
        cv = GroupKFold(n_splits=splits)
        splitter = cv.split(np.zeros(len(groups)), groups=groups)

    for i, (tr, te) in enumerate(splitter):
        yield i, tr, te
