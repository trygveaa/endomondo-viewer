import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import nbLocale from "@fullcalendar/core/locales/nb";
import sports from "./public/sports";

const userid = new URLSearchParams(window.location.search).get("userid");

const sportNames = Object.keys(sports);

function historyToEvents(history) {
  return history.map((activity) => ({
    id: activity.id,
    title: Object.keys(sports)[activity.sport],
    start: new Date(activity.local_start_time),
    allDay: true,
  }));
}

export default function Workouts() {
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  async function fetchHistory(dates) {
    const months = [];
    const monthToAdd = new Date(dates.start);
    monthToAdd.setDate(1);
    while (true) {
      months.push(new Date(monthToAdd));
      monthToAdd.setMonth(monthToAdd.getMonth() + 1);
      if (monthToAdd > dates.end) {
        break;
      }
    }

    const history = (
      await Promise.all(
        months
          .filter((date) => date < new Date(2021, 0, 1))
          .map(async (date) => {
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const data = await fetch(
              `data/${userid}/history-${date.getFullYear()}-${month}.json`
            );
            return data.json();
          })
      )
    ).flat();

    setEvents(historyToEvents(history));
  }

  async function fetchEvent(id) {
    const data = await fetch(`data/${userid}/workout-${id}-details.json`);
    const details = await data.json();
    console.log(details);
    setCurrentEvent({ details });
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ margin: "0 16px" }}>
        <h1>Aktiviteter fra Endomondo</h1>

        <FullCalendar
          plugins={[dayGridPlugin]}
          locale={nbLocale}
          aspectRatio={1.8}
          initialDate="2020-10-31"
          initialView="dayGridMonth"
          events={events}
          eventClick={(event) => fetchEvent(event.event.id)}
          datesSet={fetchHistory}
        />

        {currentEvent && (
          <>
            <h2>
              {new Intl.DateTimeFormat("nb-NO", {
                dateStyle: "full",
                timeStyle: "medium",
              }).format(new Date(currentEvent.details.local_start_time))}
            </h2>
            <h3>{sportNames[currentEvent.details.sport]}</h3>
            <p>{currentEvent.details.message}</p>
            <div
              style={{ display: "flex", flexWrap: "wrap", margin: "0 -8px" }}
            >
              {currentEvent.details.pictures.map((picture) => (
                <img
                  style={{
                    width: "calc(33.333333% - 16px)",
                    margin: "8px",
                  }}
                  key={picture.id}
                  src={picture.url}
                  alt=""
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
