import { useRef, useState } from "react";
import Modal from "react-modal";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import Map from "./Map";
import sports from "./public/sports";

Modal.setAppElement("#root");

const userid = new URLSearchParams(window.location.search).get("userid");

const sportNames = Object.keys(sports);

function formatSport(sport) {
  const name = sportNames[sport].replace(/_/g, " ");
  return name[0].toUpperCase() + name.slice(1).toLowerCase();
}

function historyToEvents(history) {
  return history.map((activity) => ({
    id: activity.id,
    title: formatSport(activity.sport),
    start: new Date(activity.local_start_time),
    allDay: true,
  }));
}

function formatTitle(details) {
  const sportName = formatSport(details.sport);
  if (details.title) {
    return `${sportName}: ${details.title}`;
  } else {
    return sportName;
  }
}

export default function Workouts() {
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentPicture, setCurrentPicture] = useState(null);
  const modalContent = useRef(null);

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

  function changePictureRelative(relativeIndex) {
    const pictures = currentEvent.details.pictures;
    const currentIndex = pictures.findIndex(
      (picture) => picture.id === currentPicture.id
    );
    const newIndex = currentIndex + relativeIndex;
    if (newIndex < 0) {
      setCurrentPicture(pictures[pictures.length - 1]);
    } else if (newIndex >= pictures.length) {
      setCurrentPicture(pictures[0]);
    } else {
      setCurrentPicture(pictures[newIndex]);
    }
  }

  function onKeyDownModal(event) {
    if (event.key === "ArrowLeft") {
      changePictureRelative(-1);
    } else if (event.key === "ArrowRight") {
      changePictureRelative(1);
    }
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ margin: "0 16px" }}>
        <h1>Activities from Endomondo</h1>

        <FullCalendar
          plugins={[dayGridPlugin]}
          firstDay={1}
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
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "full",
                timeStyle: "medium",
              }).format(new Date(currentEvent.details.local_start_time))}
            </h2>
            <h3>{formatTitle(currentEvent.details)}</h3>
            <p>{currentEvent.details.message}</p>
            <p>{currentEvent.details.notes}</p>
            <p>
              <strong>Distance:</strong>{" "}
              {currentEvent.details.distance.toFixed(2)} km
            </p>
            <p>
              <strong>Duration:</strong>{" "}
              {new Date(currentEvent.details.duration * 1000)
                .toISOString()
                .substr(11, 8)}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", margin: "-8px" }}>
              {currentEvent.details.pictures.map((picture) => (
                <img
                  style={{
                    width: "calc(33.333333% - 16px)",
                    margin: "8px",
                    objectFit: "contain",
                  }}
                  key={picture.id}
                  src={picture.url}
                  alt=""
                  onClick={() => setCurrentPicture(picture)}
                />
              ))}
            </div>

            <div style={{ margin: "16px 0" }}>
              <Map activity={currentEvent.details} />
            </div>

            <Modal
              isOpen={currentPicture != null}
              style={{ overlay: { zIndex: 2 } }}
              onRequestClose={() => setCurrentPicture(null)}
              onAfterOpen={() => modalContent.current.focus()}
            >
              <div
                ref={modalContent}
                tabIndex="-1"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  outline: "none",
                }}
                onKeyDown={onKeyDownModal}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <button onClick={() => changePictureRelative(-1)}>
                    Forrige
                  </button>
                  <button onClick={() => setCurrentPicture(null)}>Lukk</button>
                  <button onClick={() => changePictureRelative(1)}>
                    Neste
                  </button>
                </div>
                <img
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 0,
                    objectFit: "contain",
                  }}
                  src={currentPicture?.url}
                  alt=""
                />
              </div>
            </Modal>
          </>
        )}
      </div>
    </div>
  );
}
