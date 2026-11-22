export const projects = [
  {
    slug: "obstacle-detection-system",
    title: "Obstacle Detection System",
    category: "Embedded Systems",
    status: "To confirm",
    summary:
      "A real-time obstacle detection system using an STM32 and proximity sensors, paired with a C# Windows application for sensor visualization and control over serial communication.",
    technologies: ["STM32", "C#", "Proximity sensors", "Serial communication"],
    overview:
      "Built a real-time obstacle detection system using an STM32 microcontroller and proximity sensors for distance-based object sensing. Developed a companion C# Windows application to visualize sensor data and control system behaviour via serial communication.",
    projectFocus: "A sensing system with a desktop path for viewing data and sending control over serial.",
    coreQuestion: "How does a physical measurement become something a person can inspect and act on?",
    availableDetails: [
      { label: "Controller", value: "STM32 microcontroller" },
      { label: "Sensing", value: "Proximity sensors" },
      { label: "Interface", value: "C# Windows application over serial communication" },
    ],
    systemMap: {
      label: "FUNCTIONAL PATH",
      center: "STM32",
      nodes: ["PROXIMITY SENSORS", "SERIAL LINK", "C# DESKTOP APP"],
      note: "A functional map based on the project summary; pin-level wiring and protocol details are not documented here.",
    },
    engineeringQuestions: [
      "Which proximity sensor and distance range were used?",
      "How did the serial messages represent sensor data and control commands?",
      "What test cases established the system’s detection behaviour?",
    ],
  },
  {
    slug: "stm32-development-board",
    title: "STM32 Development Board",
    category: "Electronics & PCB Design",
    status: "To confirm",
    summary:
      "A custom STM32 development board PCB with USART, USB, and GPIO interfaces, designed as a flexible base for embedded projects.",
    technologies: ["STM32", "PCB design", "USART", "USB", "GPIO"],
    overview:
      "Designed a custom development board PCB around an STM32 microcontroller, supporting USART, USB, and GPIO interfaces. The résumé also notes API-based communication for external interfacing.",
    projectFocus: "A reusable STM32 base that brings several common interfaces into one board.",
    coreQuestion: "What makes a development board useful beyond a single experiment?",
    availableDetails: [
      { label: "Controller", value: "STM32 microcontroller" },
      { label: "Interfaces", value: "USART, USB, GPIO" },
      { label: "External interfacing", value: "API-based communication (as described in the résumé)" },
    ],
    systemMap: {
      label: "INTERFACE MAP",
      center: "STM32",
      nodes: ["USART", "USB", "GPIO", "API-BASED EXTERNAL INTERFACING"],
      note: "An interface map, not a schematic. Connector assignments, board revision, and electrical details are not documented here.",
    },
    engineeringQuestions: [
      "What constraints guided the board’s connector and interface choices?",
      "How was the board brought up and each interface checked?",
      "What does API-based external communication mean in this project’s implementation?",
    ],
  },
  {
    slug: "authorized-home-automation",
    title: "Custom Authorized Home Automation System",
    category: "IoT Systems",
    status: "To confirm",
    summary:
      "An ESP32-based home automation PCB combining Wi-Fi/Bluetooth, relay modules, GPIO, RFID authorization, USB programming, and ThingSpeak monitoring.",
    technologies: ["ESP32", "Wi-Fi", "Bluetooth", "RFID", "ThingSpeak", "PCB design"],
    overview:
      "Designed a custom ESP32 PCB for home automation with Wi-Fi/Bluetooth connectivity, relay modules, and GPIO. The project description also lists RFID-based access authorization, a USB programming interface, and ThingSpeak cloud connectivity for remote monitoring.",
    projectFocus: "Local access and relay control alongside wireless connectivity and remote monitoring.",
    coreQuestion: "How should local control and remote visibility meet in one embedded system?",
    availableDetails: [
      { label: "Controller", value: "ESP32" },
      { label: "Connectivity", value: "Wi-Fi and Bluetooth" },
      { label: "Access and control", value: "RFID authorization, relay modules, GPIO" },
      { label: "Monitoring", value: "ThingSpeak cloud connectivity" },
    ],
    systemMap: {
      label: "CAPABILITY MAP",
      center: "ESP32",
      nodes: ["RFID ACCESS", "RELAY / GPIO", "WI-FI · BLUETOOTH", "THINGSPEAK"],
      note: "Capabilities named in the project summary; this does not imply a complete wiring, security, or network architecture.",
    },
    engineeringQuestions: [
      "How was an RFID read translated into an access decision?",
      "What electrical isolation and safe default state were used for relay control?",
      "Which values were sent to ThingSpeak, and how was connectivity loss handled?",
    ],
  },
];

export const categories = ["All", ...new Set(projects.map((project) => project.category))];
