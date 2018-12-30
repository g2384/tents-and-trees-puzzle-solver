function solve2(treeMap, topHints, leftHints, rowCount, columnCount) {
    var result = "";
    var tentMap = new Array(rowCount);
    for (var i = 0; i < rowCount; i++) {
        tentMap[i] = new Array(columnCount);
        tentMap[i].fill(0); // 0 = not tested; 1 = tent; 2 = possible; 3 = no tent; 4 = tree
    }
    for (var row = 0; row < rowCount; row++) {
        for (var column = 0; column < columnCount; column++) {
            if (treeMap[row][column]) {
                tentMap[row][column] = 4;
            }
        }
    }
    result += "input:<br>";
    result += stringify(tentMap);
    var isValid = false;
    [isValid, errorMessage] = checkIsValid(tentMap, treeMap, topHints, leftHints);
    result += "is valid: " + isValid + "<br><br>";
    if (!isValid) {
        return result + "<br>error: " + errorMessage;
    }
    var stepCount = 1;
    var prevState = stringify(tentMap);

    RemoveZeroColumnRow(tentMap, topHints, leftHints, rowCount, columnCount);
    [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, treeMap, topHints, leftHints, prevState, result, stepCount, "ignore zero columns and rows");
    if (canReturn) {
        return result;
    }
    while (isValid) {
        excludeLand(tentMap);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, treeMap, topHints, leftHints, prevState, result, stepCount, "exclude open land (no adjacent tree)")
        if (canReturn) {
            break;
        }
        if (canContinue) {
            continue;
        }

        PlaceExplicitTents(tentMap, topHints, leftHints, rowCount, columnCount);
        [prevState, result, stepCount, canContinue, canReturn] = logStatus(tentMap, treeMap, topHints, leftHints, prevState, result, stepCount, "fill in tents")
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

function logStatus(tentMap, treeMap, topHints, leftHints, prevState, result, stepCount, description) {
    [isValid, errorMessage] = checkIsValid(tentMap, treeMap, topHints, leftHints);
    if (!isValid) {
        result += "<br>error: " + errorMessage;
        return [prevState, result, false, true];
    }

    var isSolved = checkIsSolved(tentMap, treeMap, topHints, leftHints);
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

function RemoveZeroColumnRow(tentMap, topHints, leftHints, rowCount, columnCount) {
    for (var row = 0; row < rowCount; row++) {
        if (leftHints[row] == 0) {
            for (var column = 0; column < columnCount; column++) {
                if (tentMap[row][column] != 4) {
                    tentMap[row][column] = 3;
                }
            }
        }
    }
    for (var column = 0; column < columnCount; column++) {
        if (topHints[column] == 0) {
            for (var row = 0; row < rowCount; row++) {
                if (tentMap[row][column] != 4) {
                    tentMap[row][column] = 3;
                }
            }
        }
    }
}

function PlaceExplicitTents(tentMap, topHints, leftHints, rowCount, columnCount) {
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
            if (tentStatus == 2 || tentStatus == 0) {
                topUnknownTents[column]++;
                leftUnknownTents[row]++;
            }
            if (tentStatus == 1) {
                topKnownTents[column]++;
                leftKnownTents[row]++;
            }
        }
    }
    for (var row = 0; row < rowCount; row++) {
        if (leftKnownTents[row] + leftUnknownTents[row] == leftHints[row]) {
            for (var column = 0; column < columnCount; column++) {
                var tentStatus = tentMap[row][column];
                if (tentStatus == 2 || tentStatus == 0) {
                    tentMap[row][column] = 1;
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
                if (tentStatus == 2 || tentStatus == 0) {
                    tentMap[row][column] = 1;
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
            var lastRow = row - 1;
            var lastCol = column - 1;
            var nextRow = row + 1;
            var nextCol = column + 1;
            var noTopTree = true;
            var noLeftTree = true;
            if (lastRow >= 0) {
                noTopTree = tentMap[lastRow][column] != 4;
            }
            if (lastCol >= 0) {
                noLeftTree = tentMap[row][lastCol] != 4;
            }
            var noBottomTree = true;
            var noRightTree = true;
            if (nextRow < rowCount) {
                noBottomTree = tentMap[nextRow][column] != 4;
            }
            if (nextCol < columnCount) {
                noRightTree = tentMap[row][nextCol] != 4;
            }
            if (noTopTree && noLeftTree && noBottomTree && noRightTree) {
                tentMap[row][column] = 3;
            }
        }
    }
}

function stringify(tentMap) {
    var result = "";
    for (var i = 0; i < tentMap.length; i++) {
        for (var j = 0; j < tentMap[i].length; j++) {
            var text;
            switch (tentMap[i][j]) {
                case 0:
                    text = "_";
                    break;
                case 1:
                    text = "▲";
                    break;
                case 2:
                    text = "?";
                    break;
                case 3:
                    text = "□";
                    break;
                case 4:
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

function checkIsValid(tentMap, treeMap, topHints, leftHints) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var rowTentCounts = new Array(columnCount);
    for (var column = 0; column < columnCount; column++) {
        rowTentCounts[column] = 0;
    }
    for (var row = 0; row < rowCount; row++) {
        var colTreeCount = 0;
        for (var column = 0; column < columnCount; column++) {
            if (treeMap[row][column] == 1) {
                colTreeCount++;
                rowTentCounts[column]++;
            }
        }
        if (colTreeCount + leftHints[row] > columnCount) {
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

function checkIsSolved(tentMap, treeMap, topHints, leftHints) {
    var rowCount = tentMap.length;
    var columnCount = tentMap[0].length;
    var rowTentCounts = new Array(columnCount);
    for (var column = 0; column < columnCount; column++) {
        rowTentCounts[column] = 0;
    }
    for (var row = 0; row < rowCount; row++) {
        var colTentCount = 0;
        for (var column = 0; column < columnCount; column++) {
            if (tentMap[row][column] == 1) {
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