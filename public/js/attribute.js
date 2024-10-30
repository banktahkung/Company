// & After downloading all the content, start the function time
document.addEventListener("DOMContentLoaded", () => {
  // % Build up a simple table contains the cart data
  populateTable();
  HistoryTable();

  // % Populate the table when the content is loaded
  setInterval(populateTable, 500);
  setInterval(HistoryTable, 500);
});

// & Function to get the cart history
async function GetHistory() {
  const destination = "/CartHistory";

  // % Try to get the data from backend
  try {
    const response = await fetch(destination, {
      method: "GET",
    });

    // % Get the data
    const data = response.json();

    return data;
  } catch (err) {
    console.error(err);
  }
}

// & Function to determine if a color is light or darkxw
function isColorLight(rgb) {
  // % Extract the RGB values
  const parts = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!parts) return false; // Return false if not a valid RGB string

  const r = parseInt(parts[1], 10);
  const g = parseInt(parts[2], 10);
  const b = parseInt(parts[3], 10);

  // % Calculate the luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // % Determine if it's light or dark
  return luminance > 100;
}

// & Function to populate the table with CartData
async function populateTable() {
  // % Get the information from the server
  const ImportData = await GetCart();
  const Header = Object.keys(ImportData);

  // % Get the table body container
  const tableBody = document.querySelector(".TableBody");

  // % Create the table depend on the data
  Header.forEach((hd) => {
    const checkRow = document.querySelector(`.TableRow.Cart-${hd}`);

    // % This is for updating the information
    if (checkRow) {
      const colorBlock = document.querySelector(`.colorContainer.Cart-${hd}`);
      const StatusBlock = document.querySelector(`.Status.Cart-${hd}`);
      const StartTimeBlock = document.querySelector(`.StartTime.Cart-${hd}`);
      const EndTimeBlock = document.querySelector(`.EndTime.Cart-${hd}`);
      const TimeDiffBlock = document.querySelector(`.TimeDiff.Cart-${hd}`);

      // % Color Block update
      if (CartColor[hd]) {
        colorBlock.style.backgroundColor = CartColor[hd];
      }

      // % Status block update
      if (
        ImportData[hd]["startTime"] != null ||
        ImportData[hd]["startTime"] != "--:--"
      ) {
        if (ImportData[hd]["endTime"] != null) {
          StatusBlock.textContent = "Delivered";
          StatusBlock.style.backgroundColor = "#63f558";
        } else {
          StatusBlock.textContent = "Transit";
          StatusBlock.style.backgroundColor = "#ffb752";
        }
      }

      if (ImportData[hd]["colorSet"].length == 0) {
        StatusBlock.textContent = "Parking";
        StatusBlock.style.backgroundColor = "#cc73ff";
      }

      // % Start time block update
      if (
        StartTimeBlock.textContent !=
        new Date(ImportData[hd]["startTime"]).toLocaleTimeString()
      ) {
        StartTimeBlock.textContent = ImportData[hd]["startTime"]
          ? new Date(ImportData[hd]["startTime"]).toLocaleTimeString()
          : "--:--";
      }

      // % End time block update
      if (
        !EndTimeBlock.textContent !=
        new Date(ImportData[hd]["endTime"]).toLocaleTimeString()
      ) {
        EndTimeBlock.textContent = ImportData[hd]["endTime"]
          ? new Date(ImportData[hd]["endTime"]).toLocaleTimeString()
          : "--:--";
      }

      // % Time different update
      if (
        ImportData[hd]["endTime"] != "--:--" &&
        ImportData[hd]["endTime"] != null
      ) {
        const startTime = new Date(ImportData[hd]["startTime"]).getTime();
        const endTime = new Date(ImportData[hd]["endTime"]).getTime();
        const STDDiffBlock = document.querySelector(`.STDDiff.Cart-${hd}`);
        const STDDiffValue = document.querySelector(`.STDDiffValue.Cart-${hd}`);
        const STDDiffIndicator = document.querySelector(
          `.STDDiffIndicator.Cart-${hd}`
        );
        const currentSTDBlock = document.querySelector(".CartSTDValue");

        let TimeDiff = CalculateTimeDiff(startTime, endTime);

        // % Pass startTime and endTime to CalculateTimeDiff
        TimeDiffBlock.textContent = TimeDiff;

        // % Calculate the STD diff between endTime and currentSTDTime
        let STDDiff =
          parseTimeString(currentSTDBlock.textContent) -
          parseTimeString(TimeDiff);

        // % Convert back to MM:SS.mmm
        ConvertSTDDiff = `${CheckingLength(
          Math.floor(Math.abs(STDDiff) / 60000)
        )}:${CheckingLength(Math.floor(Math.abs(STDDiff) / 1000) % 60)}.${
          Math.abs(STDDiff) % 1000
        }`;

        // % Display the absolute value of the STD difference
        STDDiffValue.textContent = ConvertSTDDiff;

        // % Add visual indication based on whether the difference is positive or negative
        if (STDDiff < 0) {
          STDDiffIndicator.textContent = " ▼";
          STDDiffIndicator.style.color = "rgb(255, 0, 0)";
          STDDiffBlock.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
        } else if (STDDiff > 0) {
          STDDiffIndicator.textContent = " ▲";
          STDDiffIndicator.style.color = "rgb(0, 186, 50)";
          STDDiffBlock.style.backgroundColor = "rgba(0, 186, 50, 0.2)";
        } else {
          STDDiffBlock.textContent += " -";
        }
      } else {
        const STDDiffValue = document.querySelector(`.STDDiffValue.Cart-${hd}`);
        const STDDiffIndicator = document.querySelector(
          `.STDDiffIndicator.Cart-${hd}`
        );
        const STDDiffBlock = document.querySelector(`.STDDiff.Cart-${hd}`);

        TimeDiffBlock.textContent = "--:--";
        STDDiffValue.textContent = "--:--";
        STDDiffIndicator.textContent = "-";
        STDDiffIndicator.style.color = "black";
        STDDiffBlock.style.backgroundColor = "white";
      }
    } else {
      // % Create the row for the data
      const row = document.createElement("div");
      row.classList.add(`TableRow`, `Cart-${hd}`);
      row.setAttribute("id", `TableRow-Cart-${hd}`);

      // % Creating color block
      const ColorContainer = document.createElement("div");

      ColorContainer.classList.add("colorContainer", `Cart-${hd}`);
      ColorContainer.setAttribute("id", `colorContainer-Cart-${hd}`);

      row.appendChild(ColorContainer);

      // % Create the cart ID block
      const CartIDBlock = document.createElement("div");
      CartIDBlock.classList.add("CartID", `Cart-${hd}`);
      CartIDBlock.textContent = hd;

      CartIDBlock.addEventListener("click", async () => {
        const Data = await GetCart();
        const Map = await GetMap();

        ShowAllPaths(
          Map["symbolSet"],
          Data[hd]["currentSolution"],
          PreviousPrediction[hd],
          CartColor[hd],
          true
        );
      });

      row.appendChild(CartIDBlock);

      // % Create the status block
      const StatusBlock = document.createElement("div");
      StatusBlock.classList.add("Status", `Cart-${hd}`);

      if (
        ImportData[hd]["startTime"] != null ||
        ImportData[hd]["startTime"] != "--:--"
      ) {
        if (ImportData[hd]["endTime"] != null) {
          StatusBlock.textContent = "Delivered";
          StatusBlock.style.backgroundColor = "#63f558";
        } else {
          StatusBlock.textContent = "Transit";
          StatusBlock.style.backgroundColor = "#ffb752";
        }
      }

      if (ImportData[hd]["colorSet"].length == 0) {
        StatusBlock.textContent = "Parking";
        StatusBlock.style.backgroundColor = "#cc73ff";
      }

      row.appendChild(StatusBlock);

      // % Create the start time block
      const StartTimeBlock = document.createElement("div");
      StartTimeBlock.classList.add("StartTime", `Cart-${hd}`);
      StartTimeBlock.textContent = ImportData[hd]["startTime"]
        ? new Date(ImportData[hd]["startTime"]).toLocaleTimeString()
        : "--:--";

      row.appendChild(StartTimeBlock);

      // % Create the end time block
      const EndTimeBlock = document.createElement("div");
      EndTimeBlock.classList.add("EndTime", `Cart-${hd}`);
      EndTimeBlock.textContent = ImportData[hd]["endTime"]
        ? new Date(ImportData[hd]["endTime"]).toLocaleTimeString()
        : "--:--";
      row.appendChild(EndTimeBlock);

      // % Create the time difference block
      const TimeDiffBlock = document.createElement("div");
      TimeDiffBlock.classList.add("TimeDiff", `Cart-${hd}`);

      if (
        ImportData[hd]["endTime"] != "--:--" &&
        ImportData[hd]["endTime"] != null
      ) {
        const startTime = new Date(ImportData[hd]["startTime"]).getTime();
        const endTime = new Date(ImportData[hd]["endTime"]).getTime();

        // % Pass startTime and endTime to CalculateTimeDiff
        TimeDiffBlock.textContent = CalculateTimeDiff(startTime, endTime);
      } else {
        TimeDiffBlock.textContent = "--:--";
      }

      row.appendChild(TimeDiffBlock);

      // % Create the STD different block
      const STDDiffBlock = document.createElement("div");
      const STDDiffValue = document.createElement("div");
      const STDDiffIndicator = document.createElement("div");

      STDDiffBlock.classList.add("STDDiff", `Cart-${hd}`);
      STDDiffValue.classList.add("STDDiffValue", `Cart-${hd}`);
      STDDiffIndicator.classList.add("STDDiffIndicator", `Cart-${hd}`);

      // % Some styling
      STDDiffValue.textContent = "--:--";
      STDDiffIndicator.textContent = "-";
      STDDiffIndicator.style.marginLeft = "5px";

      // % Append the `div`
      STDDiffBlock.appendChild(STDDiffValue);
      STDDiffBlock.appendChild(STDDiffIndicator);

      row.appendChild(STDDiffBlock);

      tableBody.appendChild(row);
    }
  });
}

// & Function to populate the history table with the CartHistory
async function HistoryTable() {
  function formatOperationDate(dateString) {
    // % Check if date is in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // If already in yyyy-mm-dd format, return it as is
      return dateString;
    }

    // % Check if date is in mm/dd/yyyy format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split("/");

      // % Return date formatted as yyyy-mm-dd
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // % If it's a Date object or other format, attempt conversion
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    // % Return null or a default value if the input is not a valid date
    return null;
  }

  const HistoryContainer = document.querySelector(".HistoryBody");

  const CartHistory = await GetHistory();

  const Header = Object.keys(CartHistory);

  Header.forEach((hd) => {
    let ContainerDiv = document.querySelector(`.Cart-${hd}.CartHisContainer`);
    let InformationDiv = document.querySelector(
      `.Cart-${hd}.InformationContainer`
    );

    // % Get the operation id
    const OperationContainer = Object.keys(CartHistory[hd]);

    if (!ContainerDiv) {
      // % Create `div` container to hold everything
      ContainerDiv = document.createElement("div");

      ContainerDiv.style.position = "relative";
      ContainerDiv.style.display = `flex`;

      ContainerDiv.classList.add(`Cart-${hd}`, `CartHisContainer`);
      ContainerDiv.style.backgroundColor = `${CartColor[hd]}`;
      ContainerDiv.style.width = `100%`;

      // % Create cart ID container
      const CartIDContainer = document.createElement("div");
      const CartID = document.createElement("div");

      CartIDContainer.style.position = "relative";
      CartIDContainer.style.display = "flex";
      CartIDContainer.style.alignItems = "flex-start";
      CartIDContainer.style.width = "10%";

      CartID.textContent = hd;
      CartID.style.width = "100%";
      CartID.style.top = "10px";
      CartID.style.position = "sticky";
      CartID.classList.add("CartID");
      CartIDContainer.appendChild(CartID);

      ContainerDiv.appendChild(CartIDContainer);

      HistoryContainer.appendChild(ContainerDiv);

      // % Create information `div` to manipulate the information part
      InformationDiv = document.createElement("div");
      InformationDiv.classList.add(`Cart-${hd}`, "InformationContainer");
      InformationDiv.style.width = "90%";
      InformationDiv.style.position = "relative";

      ContainerDiv.appendChild(InformationDiv);
    }

    if (OperationContainer.length > 3) {
      ContainerDiv.style.height = `250px`;
      ContainerDiv.style.overflowY = "auto";
    }

    // % Change the background color to match the cart color
    if (CartColor[hd]) {
      ContainerDiv.style.backgroundColor = CartColor[hd];
    }

    // % This is for the assigning history information
    OperationContainer.forEach((oc) => {
      // % Check whether there is already the operation history or not
      if (!document.querySelector(`.OP-${oc}.History`)) {
        const InformationContainerDiv = document.createElement("div");
        ContainerDiv.appendChild(InformationContainerDiv);
        InformationContainerDiv.classList.add(`OP-${oc}`, "History");
        InformationContainerDiv.style.width = `100%`;
        InformationContainerDiv.style.display = "flex";

        InformationDiv.appendChild(InformationContainerDiv);

        // % Date of operation
        const OperationDate = CartHistory[hd][oc]["date"];

        const OpDateDiv = document.createElement("div");
        OpDateDiv.classList.add(`OP-${oc}`, "OpDate");
        OpDateDiv.textContent = formatOperationDate(OperationDate);

        InformationContainerDiv.appendChild(OpDateDiv);

        // % Operation ID
        const OperationDiv = document.createElement("div");
        OperationDiv.classList.add(`OP-${oc}`, `OpID`);
        OperationDiv.textContent = oc;

        InformationContainerDiv.appendChild(OperationDiv);

        // % Start Time and End Time
        const StartTime = document.createElement("div");
        const EndTime = document.createElement("div");

        StartTime.textContent = new Date(
          CartHistory[hd][oc]["startTime"]
        ).toLocaleTimeString();
        StartTime.classList.add("StartTime");

        EndTime.textContent = new Date(
          CartHistory[hd][oc]["endTime"]
        ).toLocaleTimeString();
        EndTime.classList.add("EndTime");

        InformationContainerDiv.appendChild(StartTime);
        InformationContainerDiv.appendChild(EndTime);

        // % Collected Item
        const CollectedItemDiv = document.createElement("div");

        CollectedItemDiv.textContent = CartHistory[hd][oc]["collectedItem"];
        CollectedItemDiv.classList.add("CollectedItem");

        InformationContainerDiv.appendChild(CollectedItemDiv);

        // % Time Different
        const TimeDiffDiv = document.createElement("div");

        TimeDiffDiv.classList.add("TimeDiff");
        TimeDiffDiv.textContent = CalculateTimeDiff(
          new Date(CartHistory[hd][oc]["startTime"]).getTime(),
          new Date(CartHistory[hd][oc]["endTime"]).getTime()
        );

        let STDDiff =
          parseTimeString(document.querySelector(".CartSTDValue").textContent) -
          parseTimeString(
            CalculateTimeDiff(
              new Date(CartHistory[hd][oc]["startTime"]).getTime(),
              new Date(CartHistory[hd][oc]["endTime"]).getTime()
            )
          );

        if (STDDiff < 0) TimeDiffDiv.style.backgroundColor = `#f5331d`;
        else if (STDDiff > 0) TimeDiffDiv.style.backgroundColor = `#00ff0d`;

        InformationContainerDiv.appendChild(TimeDiffDiv);
      }
    });
  });
}

// & Function to parse "MM:SS.mmm" string into milliseconds
function parseTimeString(timeString) {
  const [minutes, seconds] = timeString.split(":");
  const [secs, millis] = seconds.split(".");
  return (
    parseInt(minutes) * 60 * 1000 + parseInt(secs) * 1000 + parseInt(millis)
  );
}

// & Just a function that do something
function CheckingLength(input) {
  if (input.toString().length == 1) {
    return "0" + input;
  } else {
    return input;
  }
}

// & Calculating the time difference
function CalculateTimeDiff(start, end) {
  // % Convert to Date objects if they aren't already
  const startTime = new Date(start);
  const endTime = new Date(end);

  // % Calculate the difference in milliseconds
  const timeDiffMs = endTime - startTime;

  // % Convert milliseconds to seconds, minutes, and hours
  const seconds = Math.floor(timeDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);

  // % Calculate the remaining minutes and seconds
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  // % Return formatted time difference as HH:MM:SS
  return `${CheckingLength(remainingMinutes)}:${CheckingLength(
    remainingSeconds
  )}.${timeDiffMs - seconds * 1000}`;
}
