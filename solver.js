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
    result += stringify(tentMap);
    var isValid = false;
    [isValid, errorMessage] = checkIsValid(tentMap, topHints, leftHints);
    result += "is valid: " + isValid + "<br><br>";
    if (!isValid) {
        return result + "<br>error: " + errorMessage;
    }
    var stepCount = 1;
    var prevState = stringify(tentMap);

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
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        PlaceTentNextToIsolatedTree(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, topHints, leftHints, prevState, result, stepCount, "fill in tents")
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
        return [prevState, result, false, true];
    }

    var isSolved = checkIsSolved(tentMap, topHints, leftHints);
    var currentState = stringify(tentMap);
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

function PlaceTentNextToIsolatedTree(tentMap) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column].isTree) {
                var coordinate = hasOnlyOneUnknownCell(tentMap, row, column);
                if ((coordinate != undefined || coordinate != null) && tentMap[coordinate[0]][coordinate[1]].isNotSet) {
                    tentMap[coordinate[0]][coordinate[1]].setType(CellType.tent);
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
                if (tentMap[row][column].isNotSet) {
                    tentMap[row][column].setType(CellType.grass);
                }
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (topHints[column] == 0) {
            for (var row = 0; row < rowCount; row++) {
                if (tentMap[row][column].isNotSet) {
                    tentMap[row][column].setType(CellType.grass);
                }
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
                if (tentStatus.isNotSet) {
                    tentMap[row][column].setType(CellType.tent);
                }
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
            var lastCol = column - 1;
            var nextRow = row + 1;
            var nextCol = column + 1;
            var noTopTree = true;
            var noLeftTree = true;
            if (lastRow >= 0) {
                noTopTree = !tentMap[lastRow][column].isTree;
            }
            if (lastCol >= 0) {
                noLeftTree = !tentMap[row][lastCol].isTree;
            }
            var noBottomTree = true;
            var noRightTree = true;
            if (nextRow < rowCount) {
                noBottomTree = !tentMap[nextRow][column].isTree;
            }
            if (nextCol < columnCount) {
                noRightTree = !tentMap[row][nextCol].isTree;
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
        result += "<br>"
    }
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