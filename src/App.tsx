import "./App.css";
import * as _ from "lodash/fp";

import { useEffect, useState, useCallback } from "react";

import env from "./.env.json";

const tabs = ["Flat", "ByProject", "ByContext"] as const;
type Tab = (typeof tabs)[number];

const statuses = ["Todo", "Wip", "NoStatus", "Review"] as const;
type TaskStatus = (typeof statuses)[number];
type Project = string;
type Context = string;
type TaskDates = { start: string; due: string };
type Task = {
  description: string;
  project: Project;
  status: TaskStatus;
  contexts: Context[];
  dates: TaskDates | undefined;
};

type ByProject = Map<Project, Task[]>;
type ByContext = Map<Context, Task[]>;

function todayDate(): string {
  let rightNow = new Date();
  return rightNow.toISOString().slice(0, 10).replace(/-/g, "");
}

function noDashDateToUnixMs(noDashDate: string): number {
  return Date.parse(
    noDashDate.slice(0, 4) +
    "-" +
    noDashDate.slice(4, 6) +
    "-" +
    noDashDate.slice(6, 8),
  );
}

function noDashDaysDiff(
  d1: string | undefined,
  d2: string,
): number | undefined {
  if (!d1) {
    return;
  }
  const diffMs = noDashDateToUnixMs(d1) - noDashDateToUnixMs(d2);
  return diffMs / (1000 * 3600 * 24);
}

function toByProject(tasks: Task[]): ByProject {
  return tasks.reduce((results: ByProject, task: Task) => {
    const p = task.project;
    if (!results.has(p)) {
      results.set(p, []);
    }
    //@ts-ignore
    results.set(p, [...results.get(p), task]);
    return results;
  }, new Map());
}

function toByContext(tasks: Task[]): ByContext {
  return tasks.reduce((results: ByContext, task: Task) => {
    if (task.contexts.length == 0) {
      if (!results.has("none")) {
        results.set("none", []);
      }
      //@ts-ignore
      results.get("none").push(task);
    }
    task.contexts.forEach((c) => {
      if (!results.has(c)) {
        results.set(c, []);
      }
      //@ts-ignore
      results.get(c).push(task);
    });
    return results;
  }, new Map());
}

// function toSortByStatus(tasks: Task[]): Task[] {
//   return _.sortBy((t: Task) => {t.status}, tasks)
// }

function StatusSelector(props: {
  selectedStatuses: TaskStatus[];
  setSelectedStatuses: (statusus: TaskStatus[]) => void;
}) {
  function has(status: TaskStatus) {
    return props.selectedStatuses.includes(status);
  }

  function handelSelected(status: TaskStatus) {
    return () => {
      if (has(status))
        props.setSelectedStatuses(
          props.selectedStatuses.filter((s) => s != status),
        );
      else props.setSelectedStatuses([...props.selectedStatuses, status]);
    };
  }

  return (
    <div>
      {statuses.map((s) => {
        return (
          <label key={s}>
            <input
              type="checkbox"
              checked={has(s as TaskStatus)}
              onChange={handelSelected(s as TaskStatus)}
            />
            {s}
          </label>
        );
      })}
    </div>
  );
}

function DatePicker(props: {
  date: string;
  setDate: (date: string) => void;
  hasDue: boolean;
  setHasDue: (hasDue: boolean) => void;
  noDue: boolean;
  setNoDue: (noDue: boolean) => void;
}) {
  function handleChange(event: any) {
    props.setDate(event.target.value);
  }
  function clear(): void {
    props.setDate("");
  }
  function today(): void {
    props.setDate(todayDate());
  }

  return (
    <div>
      <button onClick={today}>Today</button>
      <button onClick={clear}>Clear</button>
      <input type="text" value={props.date} onChange={handleChange} />
      <label>
        <input
          type="checkbox"
          checked={props.hasDue}
          onChange={() => props.setHasDue(!props.hasDue)}
        />
        HasDue
      </label>
      <label>
        <input
          type="checkbox"
          checked={props.noDue}
          onChange={() => props.setNoDue(!props.noDue)}
        />
        NoDue
      </label>
    </div>
  );
}

function CompStatus(props: { status: string; text: string }) {
  function cleanText(txt: string) {
    return txt.replace("- ", "").replace("* ", "");
  }
  return (
    <span className={"Status_" + props.status}>{cleanText(props.text)}</span>
  );
}

function CompTask(props: { task: Task; hideContext?: boolean }) {
  function displayDate(date: string | undefined) {
    if (!date) {
      return "";
    }
    return date.slice(0, 4) + "-" + date.slice(4, 6) + "-" + date.slice(6, 8);
  }

  function TaskDate(props: {
    date: string | undefined;
    diff?: number;
    className: string;
  }) {
    return (
      <span>
        {" "}
        <span className={props.className + " TaskDate"}>
          {displayDate(props.date)}
          {props.diff ? " (" + props.diff + ")" : null}
        </span>{" "}
      </span>
    );
    // return props.date ?  : null;
  }
  function StartDate(props: { task: Task }) {
    return (
      <TaskDate date={props.task.dates?.start} className="DateStart"></TaskDate>
    );
  }
  function DueDate(props: { task: Task }) {
    let dueDate = props.task.dates?.due;
    let daysDiff = noDashDaysDiff(dueDate, todayDate());
    function getDueClass(diff: number | undefined) {
      if (diff == undefined) {
        return "DateDueNone";
      }
      if (diff < 0) {
        return "DateDueOver";
      }
      if (diff > 0) {
        return "DateDueFuture";
      }
      return "DateDueToday";
    }
    return (
      <TaskDate
        date={dueDate}
        className={getDueClass(daysDiff)}
        diff={daysDiff}
      ></TaskDate>
    );
  }

  return (
    <div className="CompTask">
      <DueDate task={props.task}></DueDate>
      <div className="TextCell">
        <CompStatus
          status={props.task.status}
          text={props.task.description}
        ></CompStatus>
      </div>
      <span className="ContextCell">
        {!props.hideContext
          ? props.task.contexts.map((c) => {
            return (
              <span>
                <span className="Context" key={c}>
                  {c.replace("#x", "")}
                </span>{" "}
              </span>
            );
          })
          : null}
      </span>
      <StartDate task={props.task}></StartDate>
    </div>
  );
}

function CompByProject(props: { project: Project; tasks: Task[] }) {
  return (
    <div className="project">
      <div className="block1">
        <span className="Project_text">{props.project}</span>
      </div>
      <div className="block2">
        {props.tasks.map((t) => {
          return (
            <div key={t.description}>
              <CompTask task={t}></CompTask>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompByProjects(props: { tasks: Task[] }) {
  const byProject = toByProject(props.tasks);
  return (
    <div>
      {Array.from(byProject).map(([project, subTasks]) => {
        return (
          <div key={project}>
            <CompByProject project={project} tasks={subTasks}></CompByProject>
          </div>
        );
      })}
    </div>
  );
}

function CompByContexts(props: { tasks: Task[] }) {
  const byContext = toByContext(props.tasks);
  return (
    <div>
      {Array.from(byContext).map(([context, subTasks]) => {
        return (
          <div key={context}>
            <div className="Context">{context}</div>
            <CompByProjects tasks={subTasks}></CompByProjects>
          </div>
        );
      })}
    </div>
  );
}

function tasksBy_Project(tasks: Task[]): Task[] {
  return _.sortBy((t: Task) => t.project, tasks);
}
function tasksBy_Context(tasks: Task[]): Task[] {
  let expanded = tasks.flatMap((t) => {
    if (t.contexts.length == 0) {
      return [t];
    }
    return t.contexts.map((c) => {
      let copy = _.cloneDeep(t);
      copy.contexts = [c];
      return copy;
    });
  });
  return _.sortBy((t: Task) => t.contexts[0], expanded);
}
function tasksBy_Due(tasks: Task[]): Task[] {
  return _.sortBy((t: Task) => t.dates?.due, tasks);
}

function Flat(props: { tasks: Task[] }) {
  return (
    <div>
      {props.tasks.map((task: Task) => {
        return (
          <div key={task.description + task.contexts.join()}>
            <CompByProjects tasks={[task]}></CompByProjects>
          </div>
        );
      })}
    </div>
  );
}

async function getTasks(): Promise<Task[]> {
  const url = `${env.scheme}://${env.host}`;
  const requestOptionsFetch = {
    method: "GET",
    headers: {
      Authorization: "Basic " + btoa(env.user + ":" + env.psw),
    },
  };
  //@ts-ignore
  const response = await fetch(url + "/tasks", requestOptionsFetch);
  const tasks = (await response.json()) as Task[];
  return tasks;
  return [];
}

function App() {
  let [tasks, setTasks] = useState<Task[]>([]);
  let [selectedTab, setSelectedTab] = useState<Tab>("ByProject");
  let [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(
    statuses.map((s) => s),
  );
  let [startDate, setStartDate] = useState<string>("");
  let [hasDue, setHasDue] = useState<boolean>(false);
  let [noDue, setNoDue] = useState<boolean>(false);

  function connect() {
    const WS_URL = `${env.ws_scheme}://${env.host}/ws`;
    const ws = new WebSocket(WS_URL);
    ws.addEventListener("open", (event) => {
      ws.send("Connection established");
    });

    ws.addEventListener("message", (event) => {
      console.log("Message from server ", event.data);
      loadTasks();
    });

    ws.addEventListener("close", (event) => {
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        event.reason,
      );
      setTimeout(function() {
        connect();
      }, 1000);
    });

    ws.addEventListener("error", (event) => {
      console.error("Socket encountered error: ", event, "Closing socket");
      ws.close();
    });
  }

  useEffect(() => {
    loadTasks();
    connect();
    return;
  }, []);

  const handleKeyPress = useCallback(
    (event: any) => {
      if (event.key == "r") {
        loadTasks();
      }
      if (event.key == "d") {
        setHasDue(!hasDue);
      }
    },
    [hasDue],
  );

  useEffect(() => {
    // attach the event listener
    document.addEventListener("keydown", handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  function filteredTasks(): Task[] {
    let ftasks = _.sortBy((t: Task) => t.dates?.due, tasks);

    ftasks = _.filter(
      (t: Task) => selectedStatuses.includes(t.status) || !!t.dates,
      ftasks,
    );
    function startDateFilter(t: Task) {
      if (!startDate || startDate.length != 8) {
        return true;
      }
      if (!t.dates || !t.dates.start) {
        return true;
      }
      return Number(t.dates.start) <= Number(startDate);
    }
    ftasks = _.filter(startDateFilter, ftasks);

    if (hasDue) {
      return _.filter((t: Task) => !!t.dates?.due, ftasks);
    }
    if (noDue) {
      return _.filter((t: Task) => !t.dates?.due, ftasks);
    }
    return ftasks;
  }
  async function loadTasks() {
    const networkTasks = await getTasks();
    setTasks(networkTasks);
  }

  return (
    <div className="App">
      {/* <header className="App-header">
      </header> */}
      <StatusSelector
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
      ></StatusSelector>
      <DatePicker
        date={startDate}
        setDate={setStartDate}
        hasDue={hasDue}
        setHasDue={setHasDue}
        noDue={noDue}
        setNoDue={setNoDue}
      ></DatePicker>
      {tabs.map((t) => {
        return <button onClick={() => setSelectedTab(t)}>{t}</button>;
      })}
      <button onClick={() => loadTasks()}>Load</button>
      {((tab: Tab) => {
        switch (tab) {
          case "ByProject":
            return <CompByProjects tasks={filteredTasks()}></CompByProjects>;
          case "ByContext":
            return <CompByContexts tasks={filteredTasks()}></CompByContexts>;
          default:
            return <Flat tasks={filteredTasks()}></Flat>;
        }
      })(selectedTab)}
    </div>
  );
}

export default App;
