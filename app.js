// & Require package
const express = require("express");
const dotnev = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// & Get the dotenv
dotnev.config();

// & Define the PORT
const PORT = process.env.PORT || 5001;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PASSKEY
);

// & Building app
const app = express();

// & App configuration
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

// & Variable declaration
// + Cart Inventory {`cart ID` :
// + {colorSet : `set of instruction`, currentSolution : `set of solution(s)`, startTime : `time`, endTime : `time`, isFinish: `true or false`, optimalSolution : `a set of optimal solution`}}
let CartInventory = {
  "001": {
    colorSet: [],
    currentSolution: [],
    startTime: null,
    endTime: null,
    isFinish: false,
    optimalSolution: null,
    positionTimeStamp: [],
  },
};

// & Keep the history (data) of the cart for analysis(?)
// + Cart History {`cart ID` :
// + { `Operation ID (keep in hexadecimal format)` : {
// + path : `a set of path`, startTime : `Time start operation`, endTime : `Time end operation`, collectedItem : `a set of collected item`
// + date : `date of operation`}}}
let CartHistory = {};

// % Declare the position of each item
// + {"item Name" : {position: "its position",cart : "responsible cart"}
let Item = {
  "I-001": { position: [9, 42], cart: "001" },
  "I-002": { position: [5, 28], cart: "001" },
  "I-003": { position: [3, 23], cart: "001" },
  "I-004": { position: [9, 22], cart: "001" },
  "I-005": { position: [3, 34], cart: "001" },
};

// & Building Map
// + Initialize the function
let TheMap = { FirstFloorMap: null, SecondFloorMap: null, ThirdFloorMap: null };
let PointSet = [];

// & Define the set of rule
// + 01 = black sticker  | 02 = blue sticker  | 03 = red sticker
// + 04 = yellow sticker | 05 = white sticker | 06 = purple sticker
// * `Black` for path
// * `Blue` for the intersection
// * `Red` for the elevator
// * `Yellow` for the boundary
// * `White` for the Walk Way
// * `Purple` for the start and the end way (Parking purpose)
const RuleSet = {
  "01": "bl",
  "02": "bu",
  "03": "rd",
  "04": "yw",
  "05": "wt",
  "06": "pp",
  "07": "gn",
};

let OperationNumber = 0;

// ? --------------------------------------------------------------------------------------------------------------- ? \\
// ? ------------------------------------------------ GET and POST ------------------------------------------------- ? \\
// ? --------------------------------------------------------------------------------------------------------------- ? \\

// % Procedure of calculation
// % Get the item position and place on the map
// %

// & Get Method
app.get("/", (req, res) => {
  res.redirect("/CartShowcase");
});

// + Render the Cart Showcase page
app.get("/CartShowcase", async (req, res) => {
  // % Building the map
  if (TheMap[Object.keys(TheMap)[0]] == [] || !TheMap[Object.keys(TheMap)[0]]) {
    BuildingMap();
  }

  // Fetch data from TimeStamp and CartTable
  const HistoryData = await selectData("TimeStamp");
  const CartData = await selectData("CartTable");

  // Initialize the OperationNumber based on CartData length
  OperationNumber = CartData.length;

  // % Building up the history cart
  for (let i = 0; i < HistoryData.length; i++) {
    const OperationID = HistoryData[i]["OperationID"];

    // % Variable to track the index of the cart that contains the OperationID
    let cartIndex = -1;

    // % Loop through the CartData to find the matching OperationID
    for (let j = 0; j < CartData.length; j++) {
      // Ensure OperationID is an array in CartData[j]
      const operationIDArray = CartData[j]["OperationID"];

      // If the OperationID array exists and contains the current OperationID, get the index
      if (
        Array.isArray(operationIDArray) &&
        operationIDArray.includes(OperationID)
      ) {
        cartIndex = j;
        break; // Found the cart containing the OperationID, exit the loop
      }
    }

    // If the cartIndex was found, update CartHistory
    if (cartIndex !== -1) {
      const cartID = CartData[cartIndex]["CartID"];
      const operationIDHex = HexaDecimalConversion(OperationID);

      // % Initialize CartID in CartHistory if it doesn't exist
      if (!CartHistory[cartID]) {
        CartHistory[cartID] = {};
      }

      // Add the operation details for this cart
      CartHistory[cartID][operationIDHex] = {
        path: HistoryData[i]["path"], // Path from HistoryData
        startTime: HistoryData[i]["startTime"], // Start time from HistoryData
        endTime: HistoryData[i]["endTime"], // End time from HistoryData
        collectedItem: HistoryData[i]["collectedItem"], // Collected items from HistoryData
        date: HistoryData[i]["OperationDate"], // Extracted date from HistoryData
      };
    } else {
      console.warn(`OperationID ${OperationID} not found in CartData`);
    }
  }

  const CartHeader = Object.keys(CartInventory);

  // % Loop every header to compute the all path possible and the optimal path
  CartHeader.forEach((ch) => {
    PointSet = [[3, 38]];
    CartInventory[ch]["optimalSolution"] = null;

    // % Push the value into the point set to perform the tabu search (tsps)
    Object.keys(Item).forEach((ip) => {
      let item = Item[ip];

      if (item["cart"] == ch) {
        // % Get coordinate of item which assign for that cart
        let ItemCoordinate = Item[ip]["position"];

        PointSet.push(Item[ip]["position"]);

        // % Assign the position of item into the something that hurt my brain so much Uwohhhhhhhh
        TheMap["FirstFloorMap"]["symbolSet"][ItemCoordinate[0]][
          ItemCoordinate[1]
        ] = "D";
      }
    });

    PointSet.push([3, 38]);

    let { bestSolution, bestCost } = TabuSearch();

    for (let i = 0; i < bestSolution.length && bestSolution.length > 1; i++) {
      let bestApproach = null;

      // % Traverse to each node in the solution and end with the starter node
      if (i == bestSolution.length - 1) {
        bestApproach = AStar(
          PointSet[bestSolution[i]],
          PointSet[bestSolution[0]]
        );
      } else {
        bestApproach = AStar(
          PointSet[bestSolution[i]],
          PointSet[bestSolution[i + 1]]
        );
      }

      if (
        !CartInventory[ch]["optimalSolution"] ||
        CartInventory[ch]["optimalSolution"].length === 0
      ) {
        // % If the optimalSolution is not defined or empty, set it to bestApproach
        CartInventory[ch]["optimalSolution"] = bestApproach.slice(
          0,
          bestApproach.length - 1
        );
      } else {
        // % If there is already an optimalSolution, append the rest of the elements from bestApproach, ignoring the first one
        CartInventory[ch]["optimalSolution"] = CartInventory[ch][
          "optimalSolution"
        ].concat(bestApproach.slice(0, bestApproach.length - 1));
      }
    }
  });

  res.render("cartshowcase");
});

// + Send the information of each cart in json format
app.get("/CartInformation", (req, res) => {
  res.json(CartInventory);
});

// + Render the sending info panel page (`for development`)                                 == Render the page ==
app.get("/SendingInfoPanel", (req, res) => {
  res.render("sendinginfo");
});

// + Send the current map information                                                       == Send the Map ==
app.get("/MapInformation", (req, res) => {
  // % Send the first floor map - This could be implement later
  res.json(TheMap["FirstFloorMap"]);
});

// + Send the path information
app.get("/PathInformation", (req, res) => {
  res.json();
});

// + Send the cart history
app.get("/CartHistory", (req, res) => {
  res.json(CartHistory);
});

// & Post Method
// + Update cart information                                                                == Update Cart Info ==
app.post("/PostInformation", async (req, res) => {
  let { CartID, Package } = req.body;

  // % Convert into array (removing square brackets if present, then splitting by commas)
  if (typeof Package === "string") {
    Package = Package.replace(/[\[\]]/g, "").split(", ");
  }

  // % If the sent package is create = "create the new cart"
  if (Package.includes("create")) {
    CartInventory[CartID] = await {
      colorSet: [],
      currentSolution: [],
      startTime: null,
      endTime: null,
      isFinish: false,
      optimalSolution: null,
      positionTimeStamp: [],
    };
  }

  // % If the sent content has the cartID and package
  if (CartID && Package && !Package.includes("create")) {
    // % Update the CartInventory correctly
    if (CartInventory[CartID] === undefined) {
      // % Get the package
      console.log(`${Package}`);

      CartInventory[CartID] = await {
        colorSet: Package.map((pkg) => RuleSet[pkg]), // Convert each package to its color using RuleSet
        currentSolution: [],
        startTime: new Date(),
        endTime: null,
        isFinish: false,
        optimalSolution: null,
        positionTimeStamp: [new Date().getTime()],
      };
    } else {
      console.log(`Received : ${Package}`);

      if (CartInventory[CartID]["endTime"]) {
        console.log("Updating Cart");
        await UpdateCart(true);
      }

      if (CartInventory[CartID]["startTime"] === null) {
        CartInventory[CartID]["startTime"] = new Date();
      }

      CartInventory[CartID]["positionTimeStamp"].push(new Date().getTime());

      if (CartInventory[CartID]["colorSet"].length == 0) {
        Package.forEach((pkg) => {
          CartInventory[CartID]["colorSet"].push(RuleSet[pkg]);
        });
      } else if (
        (CartInventory[CartID]["colorSet"][
          CartInventory[CartID]["colorSet"].length - 1
        ].includes(RuleSet[Package]) &&
          Package == "01") ||
        !CartInventory[CartID]["colorSet"][
          CartInventory[CartID]["colorSet"].length - 1
        ].includes(RuleSet[Package])
      ) {
        // % Push the content into the cart inventory
        Package.forEach((pkg) => {
          CartInventory[CartID]["colorSet"].push(RuleSet[pkg]);
        });
      }
    }
  }

  // % If the content of map is null
  if (TheMap[Object.keys(TheMap)[0]] == [] || !TheMap[Object.keys(TheMap)[0]]) {
    await BuildingMap();
  }

  // % Assign the cart current solution
  if (CartInventory[CartID]["colorSet"].length > 0 && PointSet.length != 0) {
    CartInventory[CartID]["currentSolution"] = await findAllPaths(
      CartID,
      CartInventory[CartID]["colorSet"]
    );
  }

  // % Assign the end time to cart when path is found
  if (CartInventory[CartID]["isFinish"]) {
    CartInventory[CartID]["endTime"] = await new Date();
  }

  res.status(200).send(`Update ${CartID} successfully`);
});

// + Reset the information
app.post("/ResetInformation", (req, res) => {
  CartInventory = {};

  res.status(200).send("Reset information successfully");
});

// + Checking Command                                                                       == Check ==
app.post("/Checking", async (req, res) => {
  let set = [
    "06",
    "01",
    "01",
    "01",
    "02",
    "01",
    "01",
    "01",
    "02",
    "01",
    "01",
    "01",
    "02",
    "01",
    "01",
    "02",
    "01",
    "01",
    "02",
    "01",
    "01",
    "01",
    "02",
    "01",
    "01",
    "01",
    "02",
    "01",
    "01",
    "01",
    "02",
    "01",
    "01",
    "01",
    "01",
    "01",
    "06",
  ];

  set.forEach((s) => {
    if (!CartInventory["001"]) {
      CartInventory["001"] = {
        colorSet: [RuleSet[s]],
        currentSolution: [],
        startTime: new Date(),
        endTime: null,
        isFinish: false,
        optimalSolution: null,
        positionTimeStamp: [new Date().getTime()],
      };
    } else {
      CartInventory["001"].colorSet.push(RuleSet[s]);

      if (!CartInventory["001"]["startTime"]) {
        CartInventory["001"]["startTime"] = new Date();
      }
    }
  });

  // % If the content of map is null
  if (TheMap[Object.keys(TheMap)[0]] == [] || !TheMap[Object.keys(TheMap)[0]]) {
    BuildingMap();
  }

  // % Assign the cart current solution
  CartInventory["001"]["currentSolution"] = await findAllPaths(
    "001",
    CartInventory["001"]["colorSet"]
  );

  // % Assign the end time to cart when path is found
  if (CartInventory["001"]["isFinish"]) {
    CartInventory["001"]["endTime"] = new Date();
  }

  res.status(200).send(`Checking successful`);
});

// + Start the server                                                                       == Start Server ==
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// - --------------------------------------------------------------------------------------------------------------- - \\
// - -------------------------------------------------- Function --------------------------------------------------- - \\
// - --------------------------------------------------------------------------------------------------------------- - \\

// & Building Map
// + Changing Map into the array                                                            == Building Map ==
function BuildingMap() {
  // % Define the symbol to visualize the path
  const pathSymbols = {
    " ": "NaN",
    "|": "bl",
    "=": "bl",
    o: "bu",
    P: "pp",
    E: "pp",
  };

  // % Initialize the value
  if (!TheMap["FirstFloorMap"]) {
    TheMap = {
      FirstFloorMap: {
        colorSet: [],
        symbolSet: [],
      },
      SecondFloorMap: {
        colorSet: [],
        symbolSet: [],
      },
      ThirdFloorMap: {
        colorSet: [],
        symbolSet: [],
      },
    };
  }

  // % Define the Ignored Set
  const HorizontalIgnoreSet = [0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  const VerticalIgnoreSet = { 1: ["4", "8", "12"], 2: "" };

  // % Horizontal map (in front of the SMT room)
  for (let i = 0; i < 3; i++) {
    let rowColorArray = [],
      rowSymbolArray = [];

    for (let j = 0; j < 45; j++) {
      let content = "";

      if (j == 10) {
        content = "|";

        if (i == 0) {
          content = "E";
        }
      }

      const color = pathSymbols[content] || "NaN";
      rowColorArray.push(color);
      rowSymbolArray.push(content);
    }

    // % Push the symbola and color to the array
    TheMap["FirstFloorMap"].colorSet.push(rowColorArray);
    TheMap["FirstFloorMap"].symbolSet.push(rowSymbolArray);
  }

  // % Horizontal map
  for (let j = 0; j < 3; j++) {
    let rowColorArray = [],
      rowSymbolArray = [];

    for (let i = 0; i < 45; i++) {
      let content = "";

      if (j == 1 && HorizontalIgnoreSet.includes(Math.floor(i / 4))) {
        content = " ";
        if (i % 4 === 0) {
          content = "|";
          if (!HorizontalIgnoreSet.includes(Math.floor(i / 4) - 1)) {
            content = "o";
          }
        }
      } else if (i == 38 && j == 0) {
        content = "P";
      } else if (i % 4 === 0 || (j == 0 && i == 10)) {
        content = "o";
      } else {
        content = "=";
      }

      const color = pathSymbols[content] || "NaN";
      rowColorArray.push(color);
      rowSymbolArray.push(content);
    }

    // % Push the symbola and color to the array
    TheMap["FirstFloorMap"].colorSet.push(rowColorArray);
    TheMap["FirstFloorMap"].symbolSet.push(rowSymbolArray);
  }

  // % Vertical map
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      let rowColorArray = [],
        rowSymbolArray = [];
      for (let k = 0; k < 45; k++) {
        let content = "";

        if (k % 4 === 0 && !VerticalIgnoreSet[i + 1].includes(k.toString())) {
          content = "|";
        } else {
          content = " ";
        }

        const color = pathSymbols[content] || "NaN";
        rowColorArray.push(color);
        rowSymbolArray.push(content);
      }

      // % Insert the content into the Array
      TheMap["FirstFloorMap"]["colorSet"].splice(
        i * 3 + j + 4,
        0,
        rowColorArray
      );

      TheMap["FirstFloorMap"]["symbolSet"].splice(
        i * 3 + j + 4,
        0,
        rowSymbolArray
      );
    }
  }
}

// & Find and display all possible paths based on the given rule set
// + The path will only walk once until the target item is collected                             == Finding all path possible ==
// + As the item is collected, the path should be available again for other searches
// & Find and return all possible paths based on the given rule set
// + The path will only walk once until the target item is collected
// + As the item is collected, the path should be available again for other searches
function findAllPaths(CartID, ruleSet) {
  const Map = MapConstruct();

  const rows = Map.length;
  const cols = Map[0].length;

  let FirstFloorMap = TheMap["FirstFloorMap"];

  // % Assign the color rule to the cell
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      Map[i][j].colorRule = FirstFloorMap["colorSet"][i][j];
    }
  }

  // % Check if coordinates are within bounds and match the expected ruleSet color
  function isValid(x, y, ruleIndex, visited) {
    return (
      x >= 0 &&
      y >= 0 &&
      x < rows &&
      y < cols &&
      !visited[x][y] &&
      Map[x][y].colorRule === ruleSet[ruleIndex]
    );
  }

  // % Recursive DFS to find all possible paths matching the ruleSet
  function search(x, y, ruleIndex, visited, path, allPaths, backtrackCount) {
    // % Base case: if all rules are matched, store the path
    if (ruleIndex === ruleSet.length) {
      allPaths.push([...path]);
      return true;
    }

    if (
      ruleSet[ruleIndex] == "pp" &&
      ruleIndex == ruleSet.length - 1 &&
      ruleSet.length > 1
    ) {
      allPaths.push([...path]);
      return true;
    }

    // % If the cell doesn't match the expected color or is out of bounds, return
    if (!isValid(x, y, ruleIndex, visited)) {
      return false;
    }

    // % Check for backtracking limit
    if (backtrackCount > 2) {
      return false; // - Abort search if backtracking exceeds the limit
    }

    // % Mark the current cell as visited and add it to the path
    visited[x][y] = true;
    path.push([x, y]); // % Highlight the current path cell

    // % Reset the visited node if found an item
    PointSet.forEach((ps) => {
      if (ps[0] == x && ps[1] == y) {
        for (let i = 0; i < visited.length; i++) {
          for (let j = 0; j < visited[0].length; j++) {
            visited[i][j] = false;

            if (i == y && j == x) {
              visited[i][j] = true;
            }
          }
        }
      }
    });

    // % Explore all possible directions: right, left, down, up
    const directions = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    let found = false;
    for (const [dx, dy] of directions) {
      const newX = x + dx;
      const newY = y + dy;

      // % Check if the next cell is already visited (i.e., backtracking)
      const isBacktracking = visited[newX] && visited[newX][newY];

      // % Recursively search from the new cell
      if (
        search(
          newX,
          newY,
          ruleIndex + 1,
          visited,
          path,
          allPaths,
          isBacktracking ? backtrackCount + 1 : backtrackCount
        )
      ) {
        found = true;
      }
    }

    // % Backtrack: reset the current cell as unvisited for future explorations
    visited[x][y] = false; // % Reset the cell color after backtracking
    path.pop(); // % Remove the current cell from the path

    return found; // % Return true if any path was found
  }

  // % Store all found paths
  const allPaths = [];

  let A = [];

  if (ruleSet[0] == "pp") {
    // % Start pathfinding from every cell in the map (exhaustive search)
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (
          Map[i][j].colorRule === ruleSet[0] &&
          i == PointSet[0][0] &&
          j == PointSet[0][1]
        ) {
          // % Reset the visited array for each new search
          const currentVisited = Array.from({ length: rows }, () =>
            Array(cols).fill(false)
          );
          search(i, j, 0, currentVisited, [], allPaths);
        }
      }
    }

    // % If the given rule set end and start with `pp`
    if (
      ruleSet[0] == "pp" &&
      ruleSet[ruleSet.length - 1] == "pp" &&
      ruleSet.length > 2
    ) {
      // % Loop in every possible and find the one that is correct
      for (let i = 0; i < allPaths.length; i++) {
        let ap = allPaths[i];

        // % Find the different in the X and Y coordinate
        const difX = Math.abs(
          ap[ap.length - 1][0] - PointSet[PointSet.length - 1][0]
        );
        const difY = Math.abs(
          ap[ap.length - 1][1] - PointSet[PointSet.length - 1][1]
        );

        console.log(ap[ap.length - 1]);
        console.log(PointSet[PointSet.length - 1]);

        console.log(difX, difY);

        // % If the final block is one block away from the starting node
        if (Math.abs(difX + difY) == 1) {
          if (i % 4 == 0) {
            A.push(ap);
          }

          // % Change the state and consider the given ordered color set as a path
          CartInventory[CartID]["isFinish"] = true;

          return A;
        }
      }
    } else {
      for (let i = 0; i < allPaths.length / 4; i++) {
        A.push(allPaths[4 * i]);
      }

      console.log(A);

      return A;
    }
  }
}

// & Tabu Search
// + Tabu Algorithm                                                                         == Tabu Search (TSP) ==
// & Traveling saleman problem function (Tabu Search) - Using first floor map 2 dim int array
// + This algorithm follow by :
// + 1. Random the initial set
// + 2. Create a candidate list
// + 3. Evalute the function
// + 4. Choose the best solution
// + 5. Determine whether the solution is the best
// + 6. If yes return the result, if no go to the next procedure
// + 7. Update the value in the list and then go to the 2. procedure
/**
 * @return {{bestSolution: Array<number>, bestCost: number}}
 */
function TabuSearch() {
  let maxIteration = 1000;
  let tabuList = [];
  let bestSolution = [];
  let bestCost = Infinity;

  // % Step 1: Random initial set (initial route)
  let currentSolution = randomRoute(PointSet.length);
  bestSolution = [...currentSolution];

  let currentCost = TotalDistance(currentSolution);
  bestCost = currentCost;

  for (let iteration = 0; iteration < maxIteration; iteration++) {
    // % Step 2: Create a candidate list (neighbor solutions)
    let candidateList = generateCandidates(currentSolution);

    // % Step 3: Evaluate each candidate solution
    let bestCandidate = null;
    let bestCandidateCost = Infinity;

    for (let candidate of candidateList) {
      let candidateCost = TotalDistance(candidate);
      if (!isTabu(candidate, tabuList) && candidateCost < bestCandidateCost) {
        bestCandidate = candidate;
        bestCandidateCost = candidateCost;
      }
    }

    // % Step 4: Choose the best candidate
    if (bestCandidate) {
      currentSolution = bestCandidate;
      currentCost = bestCandidateCost;

      // % Step 5: Check if this is the best overall solution
      if (currentCost < bestCost) {
        bestSolution = [...currentSolution];
        bestCost = currentCost;
      }
    }

    // % Step 6: Update the Tabu list
    tabuList.push(currentSolution);
    if (tabuList.length > 10) {
      tabuList.shift();
    }
  }

  return { bestSolution, bestCost };
}

// & Helper functions for generating candidates and checking Tabu status
function generateCandidates(solution) {
  const candidates = [];
  for (let i = 1; i < solution.length - 1; i++) {
    for (let j = i + 1; j < solution.length; j++) {
      const candidate = [...solution];
      [candidate[i], candidate[j]] = [candidate[j], candidate[i]]; // Swap two cities
      candidates.push(candidate);
    }
  }
  return candidates;
}

function isTabu(solution, tabuList) {
  return tabuList.some(
    (tabuSolution) => JSON.stringify(tabuSolution) === JSON.stringify(solution)
  );
}

// & Function to determine the path different
/**
 * @param {point1: int[]}
 * @param {point2: int[]}
 * @return {pathDiff: int}
 */
function PathDifferent(point1, point2) {
  let pathDiff = 0;

  // % Find the path different by subtract each coordinate
  for (let i = 0; i < point1.length; i++) {
    pathDiff += Math.abs(point1[i] - point2[i]);
  }

  return pathDiff;
}

// & Function to calculate the total distance for the current solution
/**
 * @param {int[]} solution
 * @return {int} total distance from the given solution
 */
function TotalDistance(solution) {
  let totalDistance = 0;

  // % Calculate the total length from the current solution
  for (let i = 0; i < solution.length - 1; i++) {
    totalDistance += PathDifferent(
      PointSet[solution[i]],
      PointSet[solution[i + 1]]
    );
  }

  return totalDistance;
}

// & Helper function to generate a random route
function randomRoute(numCities) {
  const route = [0];
  const remainingCities = [...Array(numCities).keys()].slice(1); // Start from 1 to exclude the starting city
  for (let i = remainingCities.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingCities[i], remainingCities[j]] = [
      remainingCities[j],
      remainingCities[i],
    ]; // Shuffle the remaining cities
  }
  return route.concat(remainingCities); // Combine the fixed start with shuffled remaining cities
}

// & A* Algorithm
// + A* Algorithm Cell class                                                                   == A star ==
class Cell {
  // % Construct the object
  constructor(x, y, g = 0, h = 0, f = 0, parent = null, colorRule = null) {
    this.x = x;
    this.y = y;
    this.g = g; // Cost from start to the current node
    this.h = h; // Heuristic cost to the destination
    this.f = f; // Total cost: g + h
    this.parent = parent; // To trace the path
    this.obstruct = false; // Is it an obstacle
    this.neighbours = []; // Array to store neighbouring nodes
    this.colorRule = colorRule;
  }

  // % Adding the neighbour nodes
  AddingNeighbour(grid, row, col) {
    if (this.x > 0) {
      this.neighbours.push(grid[this.x - 1][this.y]); // Left
    }
    if (this.x < row - 1) {
      this.neighbours.push(grid[this.x + 1][this.y]); // Right
    }
    if (this.y > 0) {
      this.neighbours.push(grid[this.x][this.y - 1]); // Up
    }
    if (this.y < col - 1) {
      this.neighbours.push(grid[this.x][this.y + 1]); // Down
    }
  }
}

// & Turning the default map (2D array) into a 2D Cell array map
function MapConstruct() {
  // % Construct the map from the `row` and `col` of the array
  const row = TheMap["FirstFloorMap"]["colorSet"].length;
  const col = TheMap["FirstFloorMap"]["colorSet"][0].length;

  // % Create 2D grid of Cell objects
  const Map = Array.from({ length: row }, (_, i) =>
    Array.from({ length: col }, (_, j) => new Cell(i, j))
  );

  // % Initialize neighbors for each cell
  for (let i = 0; i < row; i++) {
    for (let j = 0; j < col; j++) {
      Map[i][j].AddingNeighbour(Map, row, col);
    }
  }

  return Map;
}

// & Function to compute the A* algorithm
function AStar(start, destination) {
  // % Map conversion
  const Map = MapConstruct();

  // % Set the obstruct
  for (let i = 0; i < TheMap["FirstFloorMap"]["colorSet"].length; i++) {
    for (let j = 0; j < TheMap["FirstFloorMap"]["colorSet"][0].length; j++) {
      if (TheMap["FirstFloorMap"]["colorSet"][i][j] == "NaN") {
        Map[i][j].obstruct = true;
      }
    }
  }

  // % Let the starting point and destination
  const Start = Map[start[0]][start[1]];
  const Destination = Map[destination[0]][destination[1]];

  let OpenSet = [Start]; // % Nodes to be evaluated
  let CloseSet = []; // % Nodes already evaluated

  Start.g = 0; // % Distance from start to start is 0
  Start.h = heuristic(Start, Destination); // % Heuristic cost
  Start.f = Start.g + Start.h; // % Total cost

  //% Main A* loop
  while (OpenSet.length > 0) {
    // % Find the node in OpenSet with the lowest `f` value
    let current = OpenSet.reduce((lowest, node) =>
      lowest.f < node.f ? lowest : node
    );

    // % If we've reached the destination, reconstruct the path
    if (current === Destination) {
      return reconstructPath(current);
    }

    // % Remove the current node from OpenSet and add to CloseSet
    OpenSet = OpenSet.filter((node) => node !== current);
    CloseSet.push(current);

    // % For each neighbour of the current node
    current.neighbours.forEach((neighbour) => {
      if (CloseSet.includes(neighbour) || neighbour.obstruct) {
        return; // % Ignore the neighbour if it's already evaluated or an obstacle
      }

      const tentativeG = current.g + 1; // % Distance from start to this neighbour

      if (!OpenSet.includes(neighbour)) {
        OpenSet.push(neighbour); // % Discover a new node
      } else if (tentativeG >= neighbour.g) {
        return; // % Not a better path
      }

      // % This is the best path so far
      neighbour.parent = current;
      neighbour.g = tentativeG;
      neighbour.h = heuristic(neighbour, Destination); // % Heuristic (Manhattan distance)
      neighbour.f = neighbour.g + neighbour.h; // % Total cost
    });
  }

  // % If we reach here, no path was found
  return [];
}

// & Heuristic function (Manhattan distance)
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// & Reconstruct the path from the destination to the start
function reconstructPath(current) {
  let path = [];
  while (current) {
    path.push(current);
    current = current.parent;
  }

  // % Convert the solution from cell to the array
  let Solution = [];

  path.reverse().forEach((ph) => {
    Solution.push([ph["x"], ph["y"]]);
  });

  return Solution; // Reverse to get the path from start to destination
}

// & Update cart interval
function UpdateCart(pushing = false) {
  const CartHeader = Object.keys(CartInventory);

  if(pushing){
    clearInterval(A);
  }

  OperationNumber = 0;

  // % Loop till every cart header
  CartHeader.forEach((hd) => {
    // % If the cart has the attribute `end time` and pass about 5 minutes from end time, then reset the cart state into the parking state
    if (
      CartInventory[hd]["endTime"] &&
      ((new Date().getTime() - CartInventory[hd]["endTime"].getTime()) / 60000 >
        5 ||
        pushing)
    ) {
      const HistoryHeader = Object.keys(CartHistory);

      HistoryHeader.forEach((hh) => {
        OperationNumber += Object.keys(CartHistory[hh]).length;
      });

      ResetCart(hd, OperationNumber);
    }
  });

  if(pushing){
    A = setInterval(UpdateCart, 500);
  }
}

// & Reset the cart to its initial state
// & Reset the cart to its initial state
async function ResetCart(cartID, itemLength) {
  // % Save the information in the history

  if (!CartHistory[cartID]) {
    CartHistory[cartID] = {};
  }

  const operationID = HexaDecimalConversion(itemLength + 1);

  CartHistory[cartID][operationID] = {
    Path: CartInventory[cartID]["currentSolution"],
    startTime: CartInventory[cartID]["startTime"],
    endTime: CartInventory[cartID]["endTime"],
    collectedItem: [],
    date: new Date(CartInventory[cartID]["startTime"]).toLocaleDateString(),
  };

  // Insert operation data into the TimeStamp table
  await insertData(
    {
      OperationID: operationID,
      startTime: CartInventory[cartID]["startTime"],
      endTime: CartInventory[cartID]["endTime"],
      path: CartInventory[cartID]["currentSolution"],
      collectedItem: [],
      OperationDate: `${new Date().getFullYear()}, ${
        new Date().getMonth() + 1
      }, ${new Date().getDate()}`,
      TimeStamp: CartInventory[cartID]["positionTimeStamp"],
    },
    "TimeStamp"
  );

  // % Get the cart data from the database based on CartID
  const data = await selectData("CartTable", { CartID: cartID });

  let SendingData = [];

  if (data.length === 0) {
    // If no existing cart data, insert new record
    SendingData.push(operationID);
    await insertData({ CartID: cartID, OperationID: SendingData }, "CartTable");
  } else {
    // If cart data exists, update the OperationID array by adding the new operation
    const existingOperationIDs = data[0]["OperationID"];

    // Ensure it's an array and add the new operationID
    const updatedOperationIDs = Array.isArray(existingOperationIDs)
      ? [...existingOperationIDs, operationID] // Append new operationID
      : [existingOperationIDs, operationID]; // Handle edge case if it's not an array

    // Update the table with the updated array of operation IDs
    await updateData("CartTable", cartID, { OperationID: updatedOperationIDs });
  }

  // % Initialize the cart's information for a new session
  CartInventory[cartID] = {
    colorSet: [],
    currentSolution: [],
    startTime: null,
    endTime: null,
    isFinish: false,
    optimalSolution: false,
    positionTimeStamp: [],
  };
}

// & Hexadecimal conversion
function HexaDecimalConversion(number) {
  if (number < 0) {
    return null;
  }

  // % Array of hexadecimal digits
  const hexDigits = "0123456789ABCDEF";

  let result = "";

  // % Continue dividing by 16 until the number becomes 0
  while (number > 0) {
    let remainder = number % 16;
    result = hexDigits[remainder] + result;
    number = Math.floor(number / 16);
  }

  result = result || "0"; // % Handle case for number being 0

  // Pad the result to ensure it's 8 characters long
  return result.padStart(8, "0");
}

let A = setInterval(UpdateCart, 5000);

// & SUPABASE FUNCTION
// & upload data into the supabase
async function insertData(data, table) {
  try {
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert([data]);

    if (error) {
      console.error("Error inserting data into Supabase:", error);
      return false;
    }

    console.log("Data inserted successfully:", insertedData);
    return true;
  } catch (err) {
    console.error("Unexpected error during insert:", err);
    return false;
  }
}

// & Function to select data from Supabase
async function selectData(table, filter = null) {
  try {
    let query = supabase.from(table).select("*");

    // % Apply the filter if provided
    if (filter) {
      Object.keys(filter).forEach((key) => {
        query = query.eq(key, filter[key]);
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching data from Supabase:", error);
      return { success: false, error };
    }

    console.log("Data fetched successfully:", data);
    return data;
  } catch (err) {
    console.error("Unexpected error during fetch:", err);
    return { success: false, error: err };
  }
}

// & Update the data
async function updateData(table, CartID, updatedData) {
  try {
    // Use `update()` to modify the data and `eq()` to specify the row to update
    const { data, error } = await supabase
      .from(table)
      .update(updatedData)
      .eq("CartID", CartID); // Assuming 'id' is the column to identify the row

    if (error) {
      console.error("Error updating data in Supabase:", error);
      return { success: false, error };
    }

    console.log("Data updated successfully:", data);
    return data;
  } catch (err) {
    console.error("Unexpected error during update:", err);
    return { success: false, error: err };
  }
}
