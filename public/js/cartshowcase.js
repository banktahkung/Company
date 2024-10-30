let FirstFloorMap = [];
let PreviousPrediction = {},
  CartColor = {};

// % Define the symbol to visualize the path∏
const pathSymbols = {
  " ": "NaN",
  "|": "bl",
  "=": "bl",
  o: "bu",
  P: "pp",
};

// & Wait for all contents to be loaded
document.addEventListener("DOMContentLoaded", async () => {
  // % Get the map and path (optimal && all possible paths) from the backend
  const Map = await GetMap();
  const Cart = await GetCart();

  const CartID = Object.keys(Cart);

  BuildingMap(Map);

  // % Loop in every cart id
  CartID.forEach((hd) => {
    if (!CartColor[hd]) {
      CartColor[hd] = RandomColor();

      // % Assign the data in the table with the color
      const Colorelement = document.getElementById(`colorContainer-Cart-${hd}`);

      if (Colorelement) {
        Colorelement.style.backgroundColor = CartColor[hd];
      }
    }

    if (!PreviousPrediction[hd]) {
      PreviousPrediction[hd] = {};
    }

    // % Show each of the cart current path
    Result = ShowAllPaths(
      Map["symbolSet"],
      Cart[hd]["currentSolution"],
      PreviousPrediction[hd],
      CartColor[hd],
      false
    );

    if (Result) {
      PreviousPrediction[hd] = Result;
    }
  });

  // %
  setInterval(() => {
    BuildSystem();
  }, 200);
});

async function BuildSystem() {
  // % Get the map and path (optimal && all possible paths) from the backend
  const Map = await GetMap();
  const Cart = await GetCart();

  const CartID = Object.keys(Cart);

  // % Loop in every cart id
  CartID.forEach((hd) => {
    if (!CartColor[hd]) {
      CartColor[hd] = RandomColor();

      // % Assign the data in the table with the color
      const Colorelement = document.getElementById(`colorContainer-Cart-${hd}`);

      if (Colorelement) {
        Colorelement.style.backgroundColor = CartColor[hd];
      }
    }

    // % Show each of the cart current path
    Result = ShowAllPaths(
      Map["symbolSet"],
      Cart[hd]["currentSolution"],
      PreviousPrediction[hd],
      CartColor[hd],
      false
    );

    if (Result) {
      PreviousPrediction[hd] = Result;
    }
  });
}

// & Clear the A* star visualize
function InitailizeMap() {
  for (let i = 0; i < FirstFloorMap.length; i++) {
    for (let j = 0; j < FirstFloorMap[0].length; j++) {
      const element = document.getElementById(`${i} - ${j}`);
      element.style.backgroundColor = "white";
    }
  }
}

// & Random the background color
function RandomColor() {
  let r = Math.floor(Math.random(0.15, 0.7) * 256);
  let g = Math.floor(Math.random(0.15, 0.7) * 256);
  let b = Math.floor(Math.random(0.15, 0.7) * 256);

  return `rgba(${r}, ${g}, ${b}, 0.4)`;
}

// & Get the information of the current cart
async function GetCart() {
  const destination = "/CartInformation";

  try {
    // % Await the fetch request
    const response = await fetch(destination, {
      method: "GET",
    });

    // % Check if the response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // % Parse the response as JSON
    const data = await response.json();

    // % Return the imported Data
    return data;
  } catch (error) {
    console.error("Error fetching the information:", error);
  }
}

// & Get the Map
async function GetMap() {
  const destination = "/MapInformation";

  // % Trying to get the map information from the backend
  try {
    const response = await fetch(destination, {
      method: "GET",
    });

    const data = await response.json();

    return data;
  } catch (err) {
    console.error(err);
  }
}

// & Changing Map into the array
function BuildingMap(MapData) {
  // % Get the row and col of the map
  const row = MapData["symbolSet"].length;
  const col = MapData["symbolSet"][0].length;

  const FirstFloorDiv = document.getElementById("FirstFloor");

  FirstFloorDiv.innerHTML = "";

  // % Generate the map depend on the MapData
  for (let i = 0; i < row; i++) {
    // % Create the parent division to hold the value of the cell
    const HeaderDiv = document.createElement("div");

    HeaderDiv.setAttribute("id", `ff - ${i}`);
    HeaderDiv.classList.add("Line");
    HeaderDiv.classList.add(`ff-${i}`);

    for (let j = 0; j < col; j++) {
      const div = document.createElement("div");
      div.classList.add("Path");

      // % Assign the properties to catagorized the path
      switch (MapData["symbolSet"][i][j]) {
        case " ":
          div.classList.add("Storage");
          break;
        case "o":
          div.classList.add("Intersection");
          break;
        case "P":
          div.classList.add("BeginAndTheEnd");
          break;
        case "D":
          div.classList.add("Item");
          div.addEventListener("mouseenter", () => {});
          break;
        case "E":
          div.classList.add("TempEnd");
          break;
      }

      // % Assign others properties such as text content and id
      div.textContent =
        MapData["symbolSet"][i][j] == " " ? " " : MapData["symbolSet"][i][j];
      div.setAttribute("id", `${i} - ${j}`);

      HeaderDiv.appendChild(div);
    }

    FirstFloorDiv.appendChild(HeaderDiv);
  }
}

// & Display the optimal to all items
function ShowOptimalSolution(PathSet) {
  const SelectedPath = PathSet["001"]["optimalSolution"];

  // % Draw the optimal solution
  for (let i = 0; i < SelectedPath.length; i++) {
    setTimeout(() => {
      const y = SelectedPath[i][0],
        x = SelectedPath[i][1];

      const element = document.getElementById(`${y} - ${x}`);

      if (element) {
        switch (element.style.backgroundColor) {
          case "orange":
            element.style.backgroundColor = "blue";
            break;
          case "":
            element.style.backgroundColor = "orange";
            break;
        }
      }
    }, i * 20);
  }
}

// & Display the possible path to the current item
function ShowAllPaths(
  Map,
  PathSet,
  PreviousPath = null,
  CartColor = null,
  clearPath = false
) {
  // % Clear all the path
  if (clearPath) {
    const height = Map.length;
    const width = Map[0].length;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const element = document.getElementById(`${i} - ${j}`);

        // % Change background color of the element
        if (element && !element.classList.contains("Item")) {
          element.style.backgroundColor = "white";
        }
      }
    }
  }

  // % If there is exist previous path
  if (
    PreviousPath &&
    Object.keys(PreviousPath).length > 0 &&
    PreviousPath[0].length != PathSet[0].length
  ) {
    PreviousPath.forEach((pp) => {
      pp.forEach((set) => {
        const element = document.getElementById(`${set[0]} - ${set[1]}`);

        if (element) {
          element.style.backgroundColor = "white";
        }

        if (element.classList.contains("Item")) {
          element.style.borderRadius = `50%`;
        }
      });
    });
  }

  // % If there any exists path and the path is not the same size
  if (Object.keys(PathSet).length > 0) {
    if (
      (Object.keys(PreviousPath).length > 0 &&
        PreviousPath[0].length != PathSet[0].length) ||
      Object.keys(PreviousPath).length == 0 ||
      clearPath
    ) {
      // % Get the current path
      PathSet.forEach((ps) => {
        ps.forEach((set, index) => {
          setTimeout(() => {
            const element = document.getElementById(`${set[0]} - ${set[1]}`);

            // % Change the background color to its cart color
            if (CartColor && element) {
              element.style.backgroundColor = `${CartColor}`;

              if(index == ps.length - 1){
                element.style.backgroundColor = `black`;
              }
            }

            if (element.classList.contains("Item")) {
              element.style.borderRadius = `0px`;
            }
          }, 3 * index);
        });
      });

      return PathSet;
    }
  }
  return null;
}
