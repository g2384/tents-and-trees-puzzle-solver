/* TODO
 * - use recursive function to speed up RemoveAssociatedTreesAndTents();
 * - elimiate the following cells:
 *  case 1:
 *   (3) 0 T 0 0 0 0 0
 *       3 0 3 3 3 0 3 <- the 2nd and 5th cell must be grass
 * - add more unit tests; use a proper unit test library;
 */

const const_cellType_notTested = 0,
    const_cellType_tent = 1,
    const_cellType_uncertain = 2,
    const_cellType_grass = 3,
    const_cellType_tree = 4;

class Cell {
    constructor(row, column) {
        this._type = CellType.notTested;
        this._row = row;
        this._column = column;
    }

    get row() {
        return this._row;
    }

    get column() {
        return this._column;
    }

    get type() {
        return this._type;
    }

    get isTree() {
        return this._type == CellType.tree;
    }

    get isSet() {
        return this._type == CellType.tree || this._type == CellType.grass || this._type == CellType.tent;
    }

    get isNotSet() {
        return this._type == CellType.uncertain || this._type == CellType.notTested;
    }

    get isTent() {
        return this._type == CellType.tent;
    }

    get isDefinitelyNotTent() {
        return this._type == CellType.tree || this._type == CellType.grass;
    }

    setType(type) {
        if (this.isNotSet) {
            this._type = type;
        } else {
            throw new Error("Cannot change type from " + CellType.convertToString(this._type) + " to " + CellType.convertToString(type));
        }
    }

    forceSetType(type) {
        this._type = type;
    }

    trySetType(type) {
        if (this.isNotSet) {
            this._type = type;
            return true;
        }
        return false;
    }
}

class CellType {
    static get notTested() {
        return const_cellType_notTested;
    }

    static get tent() {
        return const_cellType_tent;
    }

    static get uncertain() {
        return const_cellType_uncertain;
    }

    static get grass() {
        return const_cellType_grass;
    }

    static get tree() {
        return const_cellType_tree;
    }

    static convertToString(type) {
        switch (type) {
            case 0:
                return "not-tested";
            case 1:
                return "tent";
            case 2:
                return "uncertain";
            case 3:
                return "grass";
            case 4:
                return "tree";
        }
    }
}

class MapSnapshot {
    constructor(changedCells, map, isValid, isSolved, message) {
        this._changedCells = changedCells;
        this._map = (map == null || map == undefined) ? null : DeepCopyMap(map);
        this._isValid = isValid;
        this._isSolved = isSolved;
        this._message = message;
    }

    get changedCells() {
        return this._changedCells;
    }

    get map() {
        return this._map;
    }

    get isValid() {
        return this._isValid;
    }

    get isSolved() {
        return this._isSolved;
    }
}

/* returned format:
 {
     [
         {
            "changed" : [Cell, Cell, Cell ...]
            "map" :
                [
                    [Cell, Cell, Cell ...]
                    ...
                ]
        }
     ], [
         {
            "changed" : [Cell, Cell, Cell ...]
            "map" :
                [
                    [Cell, Cell, Cell ...]
                    ...
                ]
        }
     ]
 }
 */

function solve2(treeMap, topHints, leftHints) {
    var rowCount = leftHints.length;
    var columnCount = topHints.length;
    var result = [];
    var tentMap = new Array(rowCount);
    for (var row = 0; row < rowCount; row++) {
        tentMap[row] = new Array(columnCount);
        for (var column = 0; column < columnCount; column++) {
            tentMap[row][column] = new Cell(row, column);
        }
    }
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (treeMap[row][column] && tentMap[row][column].isNotSet) {
                tentMap[row][column].setType(CellType.tree);
            }
        }
    }

    var isValid = false;
    [isValid, errorMessage] = checkIsValid(tentMap, topHints, leftHints);
    if (!isValid) {
        return result + "<br>error: " + errorMessage;
    }
    result.push(new MapSnapshot([], tentMap, isValid, false, "input"));
    var stepCount = 1;
    var prevState = toHtml(tentMap);

    RemoveZeroColumnRow(tentMap, topHints, leftHints);
    [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "ignore zero columns and rows");
    if (canReturn) {
        return result;
    }

    var simplifiedMap = DeepCopyMap(tentMap);
    var simplifiedTopHints = DeepCopyArray(topHints);
    var simplifiedLeftHints = DeepCopyArray(leftHints);
    while (isValid) {
        CopySetCells(simplifiedMap, tentMap);
        var isRemoved = RemoveAssociatedTreesAndTents(simplifiedMap, simplifiedTopHints, simplifiedLeftHints);
        if (isRemoved) {
            result.push(new MapSnapshot(null, null, false, false, "Remove associated trees and tents."));
        }

        var isChanged = excludeLand(simplifiedMap);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude open land (no adjacent tree)")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = PlaceExplicitTents(simplifiedMap, simplifiedTopHints, simplifiedLeftHints);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            SetGrassAroundTent(tentMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents based on hints")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = PlaceTentNextToIsolatedTree(simplifiedMap);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            SetGrassAroundTent(tentMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents next to isolated trees")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = PlaceDeducedTents(simplifiedMap, simplifiedTopHints, simplifiedLeftHints);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            SetGrassAroundTent(tentMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents based on hints and deduction")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = ExcludeFullyFilledLine(simplifiedMap, simplifiedTopHints, simplifiedLeftHints);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude fully filled lines")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = ExcludeDiagonallyJointCell(simplifiedMap, simplifiedTopHints, simplifiedLeftHints);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude diagonally joint cells")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = ExcludeCornerCell(simplifiedMap);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude corner cell")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }

        isChanged = ExcludeImpossibleCell(simplifiedMap);
        if (isChanged) {
            CopySetCells(tentMap, simplifiedMap);
            [prevState, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude impossible cells")
            if (canReturn) {
                break;
            }
            if (canContinue) {
                continue;
            }
        }
        break;
    }

    var resultString = JSON.stringify(result);
    resultString = resultString.replace(/_/g, "");
    resultString = resultString.replace(/changedCells/g, "changed");
    return resultString;
}

function DeepCopyArray(arr) {
    var newArr = new Array(arr.length);
    for (var i = 0; i < arr.length; i++) {
        newArr[i] = arr[i];
    }
    return newArr;
}

function CopySetCells(map, copyFrom) {
    var rowCount = map.length;
    var columnCount = map[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            var fromCell = copyFrom[row][column];
            var cell = map[row][column];
            if (cell.isNotSet && fromCell.isSet) {
                cell.setType(fromCell.type);
            }
        }
    }
}

function TryIsTentOrNotSet(cell) {
    if (cell != undefined && cell != null) {
        return cell.isTent || cell.isNotSet;
    }
    return false;
}

function TryIsTree(cell) {
    if (cell != undefined && cell != null) {
        return cell.isTree;
    }
    return false;
}

function GetCellsAround(map, row, lastRow, nextRow, column, rowCount, columnCount) {
    var lastColumn = column - 1;
    var nextColumn = column + 1;
    var topCell, leftCell, rightCell, bottomCell;
    if (lastRow >= 0) {
        topCell = map[lastRow][column];
    }
    if (nextRow < rowCount) {
        bottomCell = map[nextRow][column];
    }
    if (lastColumn >= 0) {
        leftCell = map[row][lastColumn];
    }
    if (nextColumn < columnCount) {
        rightCell = map[row][nextColumn];
    }
    return [topCell, leftCell, rightCell, bottomCell];
}

function RemoveAssociatedTreesAndTents(map, topHints, leftHints) {
    var isRemoved = false;
    var rowCount = map.length;
    var columnCount = map[0].length;
    for (var row = 0; row < rowCount; row++) {
        var lastRow = row - 1;
        var nextRow = row + 1;
        for (var column = 0; column < columnCount; column++) {
            var cell = map[row][column];
            if (cell.isTree) {
                [topCell, leftCell, rightCell, bottomCell] = GetCellsAround(map, row, lastRow, nextRow, column, rowCount, columnCount);
                var tentCount = TryIsTentOrNotSet(topCell) +
                    TryIsTentOrNotSet(leftCell) +
                    TryIsTentOrNotSet(rightCell) +
                    TryIsTentOrNotSet(bottomCell);
                if (tentCount == 1) {
                    var tentCell = [topCell, leftCell, rightCell, bottomCell].find(e => TryIsTentOrNotSet(e));
                    if (tentCell.isTent) {
                        cell.forceSetType(CellType.grass);
                        tentCell.forceSetType(CellType.grass);
                        topHints[tentCell.column]--;
                        leftHints[tentCell.row]--;
                        isRemoved = true;
                    }
                }
            } else if (cell.isTent) {
                [topCell, leftCell, rightCell, bottomCell] = GetCellsAround(map, row, lastRow, nextRow, column, rowCount, columnCount);
                var treeCount = TryIsTree(topCell) +
                    TryIsTree(leftCell) +
                    TryIsTree(rightCell) +
                    TryIsTree(bottomCell);
                if (treeCount == 1) {
                    var treeCell = [topCell, leftCell, rightCell, bottomCell].find(e => TryIsTree(e));
                    if (treeCell.isTree) {
                        cell.forceSetType(CellType.grass);
                        treeCell.forceSetType(CellType.grass);
                        topHints[cell.column]--;
                        leftHints[cell.row]--;
                        isRemoved = true;
                    }
                }
            }
        }
    }
    return isRemoved;
}

function logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, description) {
    [isValid, errorMessage] = checkIsValid(tentMap, topHints, leftHints);
    if (!isValid) {
        var snapshot = new MapSnapshot(null, null, false, false, "<br>error: " + errorMessage);
        result.push(snapshot);
        return [prevState, stepCount, false, true];
    }

    var isSolved = checkIsSolved(tentMap, topHints, leftHints);
    var currentState = toHtml(tentMap);
    if (prevState != currentState) {
        var snapshot = new MapSnapshot(null, tentMap, false, isSolved, description);
        result.push(snapshot);
        if (isSolved) {
            return [prevState, stepCount, false, true];
        }
        stepCount++;
        prevState = currentState;
        return [prevState, stepCount, true, false];
    }
    return [prevState, stepCount, false, false];
}

function ExcludeFullyFilledLine(tentMap, topHints, leftHints) {
    // (2) 1 T 1 0 <- the last cell must be grass
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        var notSetCount = 0;
        var tentCount = 0;
        for (var column = 0; column < columnCount; column++) {
            var cell = tentMap[row][column];
            if (cell.isTent) {
                tentCount++;
            } else if (cell.isNotSet) {
                notSetCount++;
            }
        }
        if (tentCount == leftHints[row] && notSetCount > 0) {
            for (var column = 0; column < columnCount; column++) {
                isChanged |= isChanged |= tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        var notSetCount = 0;
        var tentCount = 0;
        for (var row = 0; row < rowCount; row++) {
            var cell = tentMap[row][column];
            if (cell.isTent) {
                tentCount++;
            } else if (cell.isNotSet) {
                notSetCount++;
            }
        }
        if (tentCount == topHints[column] && notSetCount > 0) {
            for (var row = 0; row < rowCount; row++) {
                isChanged |= tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
    return isChanged;
}

function ExcludeAlignedCellsInLine(emptyCell, row, rowCount, isNotSet, trySetType) {
    var lastRow = row - 1;
    var nextRow = row + 1;
    var lastCells = emptyCell[0];
    for (var i = 0; i < emptyCell.length; i++) {
        var cells = emptyCell[i]
        if (cells.length == 2 && isNotSet(row, cells[0]) && isNotSet(row, cells[1])) {
            /*(1) 0 0
             *    0 T <- 1st
             */
            if (lastRow >= 0) {
                trySetType(lastRow, cells[0]);
                trySetType(lastRow, cells[1]);
            } else if (nextRow < rowCount) {
                trySetType(nextRow, cells[0]);
                trySetType(nextRow, cells[1]);
            }
        } else if (cells.length == 3 &&
            isNotSet(row, cells[0]) &&
            isNotSet(row, cells[1]) &&
            isNotSet(row, cells[2])) {
            /*(1) 0 0 0
             *    T 0 T <- 2nd
             */
            if (lastRow >= 0) {
                trySetType(lastRow, cells[1]);
            } else if (nextRow < rowCount) {
                trySetType(nextRow, cells[1]);
            }
        } else if (lastCells.length == 1 && cells.length == 3 && cells[0] == lastCells[0] + 2) {
            /*(2) 0 T 0 0 0
             *    T 0 T T T <- 2nd
             */
            if (isNotSet(row, cells[0]) &&
                isNotSet(row, cells[1]) &&
                isNotSet(row, cells[2]) &&
                isNotSet(row, lastCells[0])) {
                if (lastRow >= 0) {
                    trySetType(lastRow, lastCells[0] + 1);
                }
                if (nextRow < rowCount) {
                    trySetType(nextRow, lastCells[0] + 1);
                }
            }
        } else if (lastCells.length == 3 && cells.length == 1 && cells[0] == lastCells[2] + 2) {
            /*(2) 0 0 0 T 0
             *    T T T 0 T <- 4th
             */
            if (isNotSet(row, cells[0]) &&
                isNotSet(row, lastCells[1]) &&
                isNotSet(row, lastCells[2]) &&
                isNotSet(row, lastCells[0])) {
                if (lastRow >= 0) {
                    trySetType(lastRow, cells[0] - 1);
                }
                if (nextRow < rowCount) {
                    trySetType(nextRow, cells[0] - 1);
                }
            }
        }
        if (i >= 1) {
            lastCells = cells;
        }
    }
}

function ExcludeDiagonallyJointCells(emptyCell, row, rowCount, isNotSet, trySetType) {
    var lastRow = row - 1;
    var nextRow = row + 1;
    var lastCells = emptyCell[0];
    for (var i = 1; i < emptyCell.length; i++) {
        var cells = emptyCell[i];
        if (lastCells.length == 1 && cells.length == 1 && cells[0] == lastCells[0] + 2) {
            /*(1) 0 T 0
             *    0 0 0 <- 2nd
             */
            if (isNotSet(row, cells[0]) && isNotSet(row, lastCells[0])) {
                if (lastRow >= 0) {
                    trySetType(lastRow, lastCells[0] + 1);
                }
                if (nextRow < rowCount) {
                    trySetType(nextRow, lastCells[0] + 1);
                }
            }
        } else if (lastCells.length == 1 && cells.length == 3 && cells[0] == lastCells[0] + 2) {
            /*(2) 0 T 0 0 0
             *    T 0 T T T <- 2nd
             */
            if (isNotSet(row, cells[0]) &&
                isNotSet(row, cells[1]) &&
                isNotSet(row, cells[2]) &&
                isNotSet(row, lastCells[0])) {
                if (lastRow >= 0) {
                    trySetType(lastRow, lastCells[0] + 1);
                }
                if (nextRow < rowCount) {
                    trySetType(nextRow, lastCells[0] + 1);
                }
            }
        } else if (lastCells.length == 3 && cells.length == 1 && cells[0] == lastCells[2] + 2) {
            /*(2) 0 0 0 T 0
             *    T T T 0 T <- 4th
             */
            if (isNotSet(row, cells[0]) &&
                isNotSet(row, lastCells[1]) &&
                isNotSet(row, lastCells[2]) &&
                isNotSet(row, lastCells[0])) {
                if (lastRow >= 0) {
                    trySetType(lastRow, cells[0] - 1);
                }
                if (nextRow < rowCount) {
                    trySetType(nextRow, cells[0] - 1);
                }
            }
        } else if (cells.length == 3 &&
            isNotSet(row, cells[0]) &&
            isNotSet(row, cells[1]) &&
            isNotSet(row, cells[2])) {
            /*(1) 0 0 0
             *    T 0 T <- 2nd
             */
            if (lastRow >= 0) {
                trySetType(lastRow, cells[1]);
            } else if (nextRow < rowCount) {
                trySetType(nextRow, cells[1]);
            }
        }
        lastCells = cells;
    }
}

function ExcludeDiagonallyJointCellsInLine(emptyCells, hints, row, rowCount, isNotSet, trySetType) {
    var emptyCell = emptyCells[row];
    var discontinuousCellsCount = CountDiscontinuousCells(emptyCell);
    if (discontinuousCellsCount == hints[row]) {
        ExcludeAlignedCellsInLine(emptyCell, row, rowCount, isNotSet, trySetType);
    } else if (discontinuousCellsCount == hints[row] + 1) {
        ExcludeDiagonallyJointCells(emptyCell, row, rowCount, isNotSet, trySetType);
    }
}

function ExcludeDiagonallyJointCell(tentMap, topHints, leftHints) {
    /*(2) 0 T 0 0
     *    0 0 0 0 <- 2nd must be grass
     */
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    [rowEmptyCells, columnEmptyCells] = GetEmptyCells(tentMap);
    for (var row = 0; row < rowCount; row++) {
        if (leftHints[row] == 0) {
            continue;
        }
        ExcludeDiagonallyJointCellsInLine(rowEmptyCells, leftHints, row, rowCount, (r, c) => {
            return tentMap[r][c].isNotSet
        }, (r, c) => isChanged |= tentMap[r][c].trySetType(CellType.grass));

    }
    for (var column = 0; column < columnCount; column++) {
        if (topHints[column] == 0) {
            continue;
        }
        ExcludeDiagonallyJointCellsInLine(columnEmptyCells, topHints, column, columnCount, (c, r) => {
            return tentMap[r][c].isNotSet
        }, (c, r) => isChanged |= tentMap[r][c].trySetType(CellType.grass));
    }
    return isChanged;
}

function ExcludeCornerCell(tentMap) {
    /*T 0
     *0 0 <- impossible
     */
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTree) {
                var lastRow = row - 1;
                var lastColumn = column - 1;
                var nextRow = row + 1;
                var nextColumn = column + 1;
                var isTopNotSet = false,
                    isBottomNotSet = false,
                    isLeftNotSet = false,
                    isRightNotSet = false;
                if (lastRow >= 0) {
                    isTopNotSet = tentMap[lastRow][column].isNotSet;
                }
                if (nextRow < rowCount) {
                    isBottomNotSet = tentMap[nextRow][column].isNotSet;
                }
                if (lastColumn >= 0) {
                    isLeftNotSet = tentMap[row][lastColumn].isNotSet;
                }
                if (nextColumn < columnCount) {
                    isRightNotSet = tentMap[row][nextColumn].isNotSet;
                }
                if (isTopNotSet && isLeftNotSet && !isBottomNotSet && !isRightNotSet) {
                    isChanged |= tentMap[lastRow][lastColumn].trySetType(CellType.grass);
                } else if (isTopNotSet && !isLeftNotSet && !isBottomNotSet && isRightNotSet) {
                    isChanged |= tentMap[lastRow][nextColumn].trySetType(CellType.grass);
                } else if (!isTopNotSet && !isLeftNotSet && isBottomNotSet && isRightNotSet) {
                    isChanged |= tentMap[nextRow][nextColumn].trySetType(CellType.grass);
                } else if (!isTopNotSet && isLeftNotSet && isBottomNotSet && !isRightNotSet) {
                    isChanged |= tentMap[nextRow][lastColumn].trySetType(CellType.grass);
                }
            }
        }
    }
    return isChanged;
}

function GetEmptyCells(tentMap) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var columnEmptyCells = new Array(columnCount);
    var rowEmptyCells = new Array(rowCount);
    var localColumnEmptyCells = new Array(columnCount);
    for (var column = 0; column < columnCount; column++) {
        localColumnEmptyCells[column] = [];
    }
    for (var row = 0; row < rowCount; row++) {
        var localRowEmptyCells = [];
        for (var column = 0; column < columnCount; column++) {
            var cell = tentMap[row][column];
            if (cell.isNotSet || cell.isTent) {
                localRowEmptyCells.push(column);
                localColumnEmptyCells[column].push(row);
            }
        }
        rowEmptyCells[row] = GroupAdjacentNumbers(localRowEmptyCells);
    }
    for (var column = 0; column < columnCount; column++) {
        columnEmptyCells[column] = GroupAdjacentNumbers(localColumnEmptyCells[column]);
    }
    return [rowEmptyCells, columnEmptyCells];
}

function PlaceDeducedTents(tentMap, topHints, leftHints) { // [0, 3, 0, 0] and hint is 2, then 1st cell must be a tent
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    [rowEmptyCells, columnEmptyCells] = GetEmptyCells(tentMap);
    for (var row = 0; row < rowCount; row++) {
        var rowEmptyCell = rowEmptyCells[row]
        if (CountDiscontinuousCells(rowEmptyCell) == leftHints[row]) {
            for (var i = 0; i < rowEmptyCell.length; i++) {
                var cells = rowEmptyCell[i];
                if ((cells.length & 1) == 1) { // is odd
                    for (var j = 0; j < cells.length; j += 2) {
                        if (!tentMap[row][cells[j]].isTent) {
                            tentMap[row][cells[j]].setType(CellType.tent);
                            isChanged = true;
                        }
                    }
                }
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        var columnEmptyCell = columnEmptyCells[column]
        if (CountDiscontinuousCells(columnEmptyCell) == topHints[column]) {
            for (var i = 0; i < columnEmptyCell.length; i++) {
                var cells = columnEmptyCell[i];
                if ((cells.length & 1) == 1) { // is odd
                    for (var j = 0; j < cells.length; j += 2) {
                        if (!tentMap[cells[j]][column].isTent) {
                            tentMap[cells[j]][column].setType(CellType.tent);
                            isChanged = true;
                        }
                    }
                }
            }
        }
    }
    return isChanged;
}

function CountDiscontinuousCells(arr) { // [[1, 2, 3], [5, 6], [7]] => 4
    var count = 0;
    for (var i = 0; i < arr.length; i++) {
        count += (arr[i].length + 1) >> 1;
    }
    return count;
}

function GroupAdjacentNumbers(arr) {
    var last = arr[0];
    var result = [
        [last]
    ];
    for (var i = 1; i < arr.length; i++) {
        var current = arr[i];
        if (current == last + 1) {
            result[result.length - 1].push(current);
        } else {
            result.push([current]);
        }
        last = current;
    }
    return result;
}

function DeepCopyMap(tentMap) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var newMap = new Array(rowCount);
    for (var row = 0; row < rowCount; row++) {
        newMap[row] = new Array(columnCount);
        for (var column = 0; column < columnCount; column++) {
            newMap[row][column] = new Cell(row, column);
            newMap[row][column].setType(tentMap[row][column].type);
        }
    }
    return newMap;
}

function ExcludeImpossibleCell(tentMap) {
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isNotSet) {
                var newMap = DeepCopyMap(tentMap);
                newMap[row][column].setType(CellType.tent);
                SetGrassAroundTent(newMap);
                var lastRow = row - 1;
                var lastColumn = column - 1;
                var nextRow = row + 1;
                var nextColumn = column + 1;
                var treeWithOneTentCount = 0;
                if (lastRow >= 0) {
                    treeWithOneTentCount += HasNTentAroundTree(newMap, lastRow, column, 0, [
                        [row, column]
                    ]) == true;
                }
                if (nextRow < rowCount) {
                    treeWithOneTentCount += HasNTentAroundTree(newMap, nextRow, column, 0, [
                        [row, column]
                    ]) == true;
                }
                if (lastColumn >= 0) {
                    treeWithOneTentCount += HasNTentAroundTree(newMap, row, lastColumn, 0, [
                        [row, column]
                    ]) == true;
                    if (lastRow >= 0) {
                        treeWithOneTentCount += HasNTentAroundTree(newMap, lastRow, lastColumn, 0, [
                            [row, column]
                        ]) == true;
                    }
                    if (nextRow < rowCount) {
                        treeWithOneTentCount += HasNTentAroundTree(newMap, nextRow, lastColumn, 0, [
                            [row, column]
                        ]) == true;
                    }
                }
                if (nextColumn < columnCount) {
                    treeWithOneTentCount += HasNTentAroundTree(newMap, row, nextColumn, 0, [
                        [row, column]
                    ]) == true;
                    if (lastRow >= 0) {
                        treeWithOneTentCount += HasNTentAroundTree(newMap, lastRow, nextColumn, 0, [
                            [row, column]
                        ]) == true;
                    }
                    if (nextRow < rowCount) {
                        treeWithOneTentCount += HasNTentAroundTree(newMap, nextRow, nextColumn, 0, [
                            [row, column]
                        ]) == true;
                    }
                }
                if (treeWithOneTentCount > 1) { // an impossible cell, must be grass
                    tentMap[row][column].setType(CellType.grass);
                    isChanged = true;
                }
            }
        }
    }
    return isChanged;
}

function ContainCoordinate(coordinates, row, column) {
    for (var i = 0; i < coordinates.length; i++) {
        if (coordinates[i][0] == row &&
            coordinates[i][1] == column) {
            return true;
        }
    }
    return false;
}

function HasNTentAroundTree(tentMap, row, column, n, excludedCoordinates = []) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    if (tentMap[row][column].isTree) {
        var lastRow = row - 1;
        var lastColumn = column - 1;
        var nextRow = row + 1;
        var nextColumn = column + 1;
        var tentCount = 0;
        if (lastRow >= 0 && !ContainCoordinate(excludedCoordinates, lastRow, column)) {
            tentCount += tentMap[lastRow][column].isTent || tentMap[lastRow][column].isNotSet;
        }
        if (nextRow < rowCount && !ContainCoordinate(excludedCoordinates, nextRow, column)) {
            tentCount += tentMap[nextRow][column].isTent || tentMap[nextRow][column].isNotSet;
        }
        if (lastColumn >= 0 && !ContainCoordinate(excludedCoordinates, row, lastColumn)) {
            tentCount += tentMap[row][lastColumn].isTent || tentMap[row][lastColumn].isNotSet;
        }
        if (nextColumn < columnCount && !ContainCoordinate(excludedCoordinates, row, nextColumn)) {
            tentCount += tentMap[row][nextColumn].isTent || tentMap[row][nextColumn].isNotSet;
        }
        return tentCount == n;
    }
    return null;
}

function SetGrassAroundTent(tentMap) {
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTent) {
                var lastRow = row - 1;
                if (lastRow >= 0) {
                    isChanged |= tentMap[lastRow][column].trySetType(CellType.grass);
                }
                var nextRow = row + 1;
                if (nextRow < rowCount) {
                    isChanged |= tentMap[nextRow][column].trySetType(CellType.grass);
                }
                var lastColumn = column - 1;
                if (lastColumn >= 0) {
                    isChanged |= tentMap[row][lastColumn].trySetType(CellType.grass);
                    if (lastRow >= 0) {
                        isChanged |= tentMap[lastRow][lastColumn].trySetType(CellType.grass);
                    }
                    if (nextRow < rowCount) {
                        isChanged |= tentMap[nextRow][lastColumn].trySetType(CellType.grass);
                    }
                }
                var nextColumn = column + 1;
                if (nextColumn < columnCount) {
                    isChanged |= tentMap[row][nextColumn].trySetType(CellType.grass);
                    if (lastRow >= 0) {
                        isChanged |= tentMap[lastRow][nextColumn].trySetType(CellType.grass);
                    }
                    if (nextRow < rowCount) {
                        isChanged |= tentMap[nextRow][nextColumn].trySetType(CellType.grass);
                    }
                }
            }
        }
    }
    return isChanged;
}

function PlaceTentNextToIsolatedTree(tentMap) {
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTree) {
                var coordinate = hasOnlyOneUnknownCell(tentMap, row, column);
                if ((coordinate != undefined || coordinate != null)) {
                    isChanged |= tentMap[coordinate[0]][coordinate[1]].trySetType(CellType.tent);
                }
            }
        }
    }
    return isChanged;
}

function hasOnlyOneUnknownCell(tentMap, row, column) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var isTopNotTent = row <= 0 || (row > 0 && tentMap[row - 1][column].isDefinitelyNotTent);
    var isBottomNotTent = row >= rowCount - 1 || (row < rowCount - 1 && tentMap[row + 1][column].isDefinitelyNotTent);
    var isleftNotTent = column <= 0 || (column > 0 && tentMap[row][column - 1].isDefinitelyNotTent);
    var isRightNotTent = column >= columnCount - 1 || (column < columnCount - 1 && tentMap[row][column + 1].isDefinitelyNotTent);
    var coordinate;
    if (!isTopNotTent) {
        coordinate = [row - 1, column];
    }
    if (!isBottomNotTent) {
        coordinate = [row + 1, column];
    }
    if (!isleftNotTent) {
        coordinate = [row, column - 1];
    }
    if (!isRightNotTent) {
        coordinate = [row, column + 1];
    }
    if (isTopNotTent + isBottomNotTent + isleftNotTent + isRightNotTent == 3) {
        return coordinate;
    }
    return null;
}

function RemoveZeroColumnRow(tentMap, topHints, leftHints) {
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        if (leftHints[row] == 0) {
            for (var column = 0; column < columnCount; column++) {
                isChanged |= tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (topHints[column] == 0) {
            for (var row = 0; row < rowCount; row++) {
                isChanged |= tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
    return isChanged;
}

// number of unknown cells = hint
function PlaceExplicitTents(tentMap, topHints, leftHints) {
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var topUnknownTents = new Array(columnCount);
    topUnknownTents.fill(0);
    var leftUnknownTents = new Array(rowCount);
    leftUnknownTents.fill(0);
    var topKnownTents = new Array(columnCount);
    topKnownTents.fill(0);
    var leftKnownTents = new Array(rowCount);
    leftKnownTents.fill(0);
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            var cell = tentMap[row][column];
            if (cell.isNotSet) {
                topUnknownTents[column]++;
                leftUnknownTents[row]++;
            } else if (cell.isTent) {
                topKnownTents[column]++;
                leftKnownTents[row]++;
            }
        }
    }
    for (var row = 0; row < rowCount; row++) {
        if (leftUnknownTents[row] == 0) {
            continue;
        }
        if (leftKnownTents[row] + leftUnknownTents[row] == leftHints[row]) {
            for (var column = 0; column < columnCount; column++) {
                var cell = tentMap[row][column];
                if (cell.isNotSet) {
                    tentMap[row][column].setType(CellType.tent);
                    isChanged = true;
                    topUnknownTents[column]--;
                    topKnownTents[column]++;
                }
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (topUnknownTents[column] == 0) {
            continue;
        }
        if (topKnownTents[column] + topUnknownTents[column] == topHints[column]) {
            for (var row = 0; row < rowCount; row++) {
                var cell = tentMap[row][column];
                isChanged |= tentMap[row][column].trySetType(CellType.tent);
            }
        }
    }

    [rowEmptyCells, columnEmptyCells] = GetEmptyCells(tentMap);

    isChanged |= PlaceOnesAndThreesTents(rowCount, rowEmptyCells, leftHints, (r, c) => {
        return tentMap[r][c].isNotSet
    }, (r, c) => tentMap[r][c].setType(CellType.tent));

    isChanged |= PlaceOnesAndThreesTents(columnCount, columnEmptyCells, topHints, (c, r) => {
        return tentMap[r][c].isNotSet
    }, (c, r) => tentMap[r][c].setType(CellType.tent));
    return isChanged;
}

function PlaceOnesAndThreesTents(rowCount, rowEmptyCells, leftHints, isNotSet, setType) {
    var isChanged = false;
    for (var row = 0; row < rowCount; row++) {
        if (leftHints[row] == 0) {
            continue;
        }
        var emptyCell = rowEmptyCells[row];
        var discontinuousCellsCount = CountDiscontinuousCells(emptyCell);
        if (discontinuousCellsCount < leftHints[row]) {
            var diff = (leftHints[row] - discontinuousCellsCount + 1) >> 1;
            //// (3) 0 0 0 T 0 <- 1st, 3rd and 5th are tents
            var threes = 0;
            var largerThanThree = 0;
            for (var i = 0; i < emptyCell.length; i++) {
                var emptyCellLength = emptyCell[i].length;
                if (emptyCellLength == 3) {
                    threes++;
                } else if (emptyCellLength > 3) {
                    largerThanThree++;
                }
            }
            if (largerThanThree == 0 && threes == diff) {
                for (var i = 0; i < emptyCell.length; i++) {
                    var cells = emptyCell[0];
                    if (cells.length == 1 && isNotSet(row, cells[0])) {
                        setType(row, cells[0]);
                        isChanged = true;
                    }
                    if (cells.length == 3 &&
                        isNotSet(row, cells[0]) &&
                        isNotSet(row, cells[1]) &&
                        isNotSet(row, cells[2])) {
                        // (2) 0 0 0 <- 1st and 3rd are tents
                        setType(row, cells[0]);
                        setType(row, cells[2]);
                        isChanged = true;
                    }
                }
            }
        } else if (discontinuousCellsCount == leftHints[row]) {
            var largerThanTwo = emptyCell.find(e => e.length > 2);
            if (largerThanTwo == undefined || largerThanTwo == null) {
                for (var i = 0; i < emptyCell.length; i++) {
                    var cells = emptyCell[0];
                    if (cells.length == 1 && isNotSet(row, cells[0])) {
                        setType(row, cells[0]);
                        isChanged = true;
                    }
                }
            }
        }
    }
    return isChanged;
}

function excludeLand(tentMap) {
    var isChanged = false;
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (!tentMap[row][column].isNotSet) {
                continue;
            }
            var lastRow = row - 1;
            var lastColumn = column - 1;
            var nextRow = row + 1;
            var nextColumn = column + 1;
            var noTopTree = true;
            var noLeftTree = true;
            if (lastRow >= 0) {
                noTopTree = !tentMap[lastRow][column].isTree;
            }
            if (lastColumn >= 0) {
                noLeftTree = !tentMap[row][lastColumn].isTree;
            }
            var noBottomTree = true;
            var noRightTree = true;
            if (nextRow < rowCount) {
                noBottomTree = !tentMap[nextRow][column].isTree;
            }
            if (nextColumn < columnCount) {
                noRightTree = !tentMap[row][nextColumn].isTree;
            }
            if (noTopTree && noLeftTree && noBottomTree && noRightTree) {
                tentMap[row][column].setType(CellType.grass);
                isChanged = true;
            }
        }
    }
    return isChanged;
}

function stringify(tentMap) {
    var result = "";
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var i = 0; i < rowCount; i++) {
        for (var j = 0; j < columnCount; j++) {
            var text;
            switch (tentMap[i][j].type) {
                case CellType.notTested:
                    text = "_";
                    break;
                case CellType.tent:
                    text = "▲";
                    break;
                case CellType.uncertain:
                    text = "?";
                    break;
                case CellType.grass:
                    text = "□";
                    break;
                case CellType.tree:
                    text = "T";
                    break;

            }
            result += text;
        }
        result += "\n"
    }
    return result;
}

function toHtml(tentMap) {
    var result = stringify(tentMap).replace(/\n/g, "<br>");
    return "<div class='text-map'>" +
        result + "</div>";
}

function checkIsValid(tentMap, topHints, leftHints) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var rowTentCounts = new Array(columnCount);
    for (var column = 0; column < columnCount; column++) {
        rowTentCounts[column] = 0;
    }
    for (var row = 0; row < rowCount; row++) {
        var colTentCount = 0;
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTent) {
                colTentCount++;
                rowTentCounts[column]++;
            }
        }
        if (colTentCount + leftHints[row] > columnCount) {
            return [false, "row " + row + " is inavlid"];
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (rowTentCounts[column] + topHints[column] > rowCount) {
            return [false, "column " + column + " is inavlid"];
        }
    }
    var totalTopHint = topHints.reduce((a, b) => a + b, 0);
    var totalLeftHint = leftHints.reduce((a, b) => a + b, 0);
    if (totalTopHint != totalLeftHint) {
        return [false, "total tents hint (top) must be equal to total tents hint (left)"];
    }
    return [true, ""];
}

function checkIsSolved(tentMap, topHints, leftHints) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var rowTentCounts = new Array(columnCount);
    var rowNotSetCounts = new Array(columnCount);
    for (var column = 0; column < columnCount; column++) {
        rowTentCounts[column] = 0;
        rowNotSetCounts[column] = 0;
    }
    for (var row = 0; row < rowCount; row++) {
        var columnTentCount = 0;
        var columnNotSetCount = 0;
        for (var column = 0; column < columnCount; column++) {
            var cell = tentMap[row][column];
            if (cell.isTent) {
                columnTentCount++;
                rowTentCounts[column]++;
            } else if (cell.isNotSet) {
                columnNotSetCount++;
                rowNotSetCounts[column]++;
            }
        }
        if (columnTentCount != leftHints[row]) {
            return false;
        }
        if (columnNotSetCount > 0) {
            return false;
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (rowTentCounts[column] != topHints[column]) {
            return false;
        }
        if (rowNotSetCounts[column]) {
            return false;
        }
    }
    return true;
}