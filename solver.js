/* TODO
 * - elimiate associated trees and tents to simplify map;
 * - elimiate the following cells:
 *  case 1:
 *   (3) 0 T 0 0 T 0
 *       3 0 3 3 0 3 <- the 2nd and 5th cell must be grass
 *  case 2:
 *   (3) 0 T 0 0 0 0 0
 *       3 0 3 3 3 0 3 <- the 2nd and 5th cell must be grass
 * - solve2() should return in json format;
 * - add more unit tests; use a proper unit test library;
 */

const const_cellType_notTested = 0,
    const_cellType_tent = 1,
    const_cellType_uncertain = 2,
    const_cellType_grass = 3,
    const_cellType_tree = 4;

class Cell {
    constructor() {
        this._type = CellType.notTested;
    }

    get type() {
        return this._type;
    }

    get isTree() {
        return this._type == CellType.tree;
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

    trySetType(type) {
        if (this.isNotSet) {
            this._type = type;
        }
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

function solve2(treeMap, topHints, leftHints) {
    var rowCount = leftHints.length;
    var columnCount = topHints.length;
    var result = "";
    var tentMap = new Array(rowCount);
    for (var row = 0; row < rowCount; row++) {
        tentMap[row] = new Array(columnCount);
        for (var column = 0; column < columnCount; column++) {
            tentMap[row][column] = new Cell();
        }
    }
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (treeMap[row][column] && tentMap[row][column].isNotSet) {
                tentMap[row][column].setType(CellType.tree);
            }
        }
    }
    result += "input:<br>";
    result += toHtml(tentMap);
    var isValid = false;
    [isValid, errorMessage] = checkIsValid(tentMap, topHints, leftHints);
    result += "is valid: " + isValid + "<br><br>";
    if (!isValid) {
        return result + "<br>error: " + errorMessage;
    }
    var stepCount = 1;
    var prevState = toHtml(tentMap);

    RemoveZeroColumnRow(tentMap, topHints, leftHints);
    [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "ignore zero columns and rows");
    if (canReturn) {
        return result;
    }
    while (isValid) {
        excludeLand(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude open land (no adjacent tree)")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        PlaceExplicitTents(tentMap, topHints, leftHints);
        SetGrassAroundTent(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents based on hints")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        PlaceTentNextToIsolatedTree(tentMap);
        SetGrassAroundTent(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents next to isolated trees")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        PlaceDeducedTents(tentMap, topHints, leftHints);
        SetGrassAroundTent(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents based on hints and deduction")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        ExcludeFullyFilledLine(tentMap, topHints, leftHints);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude fully filled lines")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        ExcludeDiagonallyJointCell(tentMap, topHints, leftHints);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude diagonally joint cells")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        ExcludeCornerCell(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude corner cell")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        ExcludeImpossibleCell(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "exclude impossible cells")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }
        break;
    }

    return result;
}

function logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, description) {
    [isValid, errorMessage] = checkIsValid(tentMap, topHints, leftHints);
    if (!isValid) {
        result += "<br>error: " + errorMessage;
        return [prevState, result, stepCount, false, true];
    }

    var isSolved = checkIsSolved(tentMap, topHints, leftHints);
    var currentState = toHtml(tentMap);
    if (prevState != currentState) {
        result += "step " + stepCount + ": " + description + "<br>";
        result += currentState;
        result += "is solved: " + isSolved + "<br><br>";
        if (isSolved) {
            return [prevState, result, stepCount, false, true];
        }
        stepCount++;
        prevState = currentState;
        return [prevState, result, stepCount, true, false];
    }
    return [prevState, result, stepCount, false, false];
}

function ExcludeFullyFilledLine(tentMap, topHints, leftHints) {
    // (2) 1 T 1 0 <- the last cell must be grass
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
                tentMap[row][column].trySetType(CellType.grass);
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
                tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
}

function ExcludeAlignedCellsInLine(emptyCell, row, rowCount, isNotSet, trySetType) {
    var lastRow = row - 1;
    var nextRow = row + 1;
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
        }
    }
}

function test(emptyCell, row, rowCount, isNotSet, trySetType) {
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
        test(emptyCell, row, rowCount, isNotSet, trySetType);
    }
}

function ExcludeDiagonallyJointCell(tentMap, topHints, leftHints) {
    /*(2) 0 T 0 0
     *    0 0 0 0 <- 2nd must be grass
     */
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    [rowEmptyCells, columnEmptyCells] = GetEmptyCells(tentMap);
    for (var row = 0; row < rowCount; row++) {
        if (leftHints[row] == 0) {
            continue;
        }
        ExcludeDiagonallyJointCellsInLine(rowEmptyCells, leftHints, row, rowCount, (r, c) => {
            return tentMap[r][c].isNotSet
        }, (r, c) => tentMap[r][c].trySetType(CellType.grass));

    }
    for (var column = 0; column < columnCount; column++) {
        if (topHints[column] == 0) {
            continue;
        }
        ExcludeDiagonallyJointCellsInLine(columnEmptyCells, topHints, column, columnCount, (c, r) => {
            return tentMap[r][c].isNotSet
        }, (c, r) => tentMap[r][c].trySetType(CellType.grass));
    }
}

function ExcludeCornerCell(tentMap) {
    /*T 0
     *0 0 <- impossible
     */
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
                    tentMap[lastRow][lastColumn].trySetType(CellType.grass);
                } else if (isTopNotSet && !isLeftNotSet && !isBottomNotSet && isRightNotSet) {
                    tentMap[lastRow][nextColumn].trySetType(CellType.grass);
                } else if (!isTopNotSet && !isLeftNotSet && isBottomNotSet && isRightNotSet) {
                    tentMap[nextRow][nextColumn].trySetType(CellType.grass);
                } else if (!isTopNotSet && isLeftNotSet && isBottomNotSet && !isRightNotSet) {
                    tentMap[nextRow][lastColumn].trySetType(CellType.grass);
                }
            }
        }
    }
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
                        }
                    }
                }
            }
        }
    }
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
            newMap[row][column] = new Cell();
            newMap[row][column].setType(tentMap[row][column].type);
        }
    }
    return newMap;
}

function ExcludeImpossibleCell(tentMap) {
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
                }
            }
        }
    }
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
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTent) {
                var lastRow = row - 1;
                if (lastRow >= 0) {
                    tentMap[lastRow][column].trySetType(CellType.grass);
                }
                var nextRow = row + 1;
                if (nextRow < rowCount) {
                    tentMap[nextRow][column].trySetType(CellType.grass);
                }
                var lastColumn = column - 1;
                if (lastColumn >= 0) {
                    tentMap[row][lastColumn].trySetType(CellType.grass);
                    if (lastRow >= 0) {
                        tentMap[lastRow][lastColumn].trySetType(CellType.grass);
                    }
                    if (nextRow < rowCount) {
                        tentMap[nextRow][lastColumn].trySetType(CellType.grass);
                    }
                }
                var nextColumn = column + 1;
                if (nextColumn < columnCount) {
                    tentMap[row][nextColumn].trySetType(CellType.grass);
                    if (lastRow >= 0) {
                        tentMap[lastRow][nextColumn].trySetType(CellType.grass);
                    }
                    if (nextRow < rowCount) {
                        tentMap[nextRow][nextColumn].trySetType(CellType.grass);
                    }
                }
            }
        }
    }
}

function PlaceTentNextToIsolatedTree(tentMap) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTree) {
                var coordinate = hasOnlyOneUnknownCell(tentMap, row, column);
                if ((coordinate != undefined || coordinate != null)) {
                    tentMap[coordinate[0]][coordinate[1]].trySetType(CellType.tent);
                }
            }
        }
    }
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
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        if (leftHints[row] == 0) {
            for (var column = 0; column < columnCount; column++) {
                tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (topHints[column] == 0) {
            for (var row = 0; row < rowCount; row++) {
                tentMap[row][column].trySetType(CellType.grass);
            }
        }
    }
}

// number of unknown cells = hint
function PlaceExplicitTents(tentMap, topHints, leftHints) {
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
            var tentStatus = tentMap[row][column];
            if (tentStatus.isNotSet) {
                topUnknownTents[column]++;
                leftUnknownTents[row]++;
            }
            if (tentStatus.isTent) {
                topKnownTents[column]++;
                leftKnownTents[row]++;
            }
        }
    }
    for (var row = 0; row < rowCount; row++) {
        if (leftKnownTents[row] + leftUnknownTents[row] == leftHints[row]) {
            for (var column = 0; column < columnCount; column++) {
                var tentStatus = tentMap[row][column];
                if (tentStatus.isNotSet) {
                    tentMap[row][column].setType(CellType.tent);
                    topUnknownTents[column]--;
                    topKnownTents[column]++;
                }
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (topKnownTents[column] + topUnknownTents[column] == topHints[column]) {
            for (var row = 0; row < rowCount; row++) {
                var tentStatus = tentMap[row][column];
                tentMap[row][column].trySetType(CellType.tent);
            }
        }
    }
}

function excludeLand(tentMap) {
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
            }
        }
    }
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
        if (colTentCount != leftHints[row]) {
            return false;
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (rowTentCounts[column] != topHints[column]) {
            return false;
        }
    }
    return true;
}