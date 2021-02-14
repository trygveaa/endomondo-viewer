import { useRef, useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import Modal from "react-modal";
import MonthPicker from "react-month-picker";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import Map from "./Map";
import sports from "./endomondo-download/public/sports";
import "react-month-picker/css/month-picker.css";

Modal.setAppElement("#root");

const sportNames = Object.keys(sports);
const monthAndYearFormat = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
});
const dateAndTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "medium",
});

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function formatSport(sport) {
  const name = sportNames[sport].replace(/_/g, " ");
  return name[0].toUpperCase() + name.slice(1).toLowerCase();
}

function formatTime(timeString) {
  return dateAndTimeFormat.format(new Date(timeString));
}

function historyToEvents(history, dataPath, userId) {
  return history.map((activity) => ({
    id: activity.id,
    title: formatSport(activity.sport),
    url: `?dataPath=${dataPath}&userId=${userId}&eventId=${activity.id}`,
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
  const calendar = useRef(null);
  const modalContent = useRef(null);
  const monthPicker = useRef(null);

  const history = useHistory();
  const query = useQuery();
  const dataPath = query.get("dataPath");
  const userId = query.get("userId");
  const dataPathWithUserId = `${dataPath}/${userId}`;
  const eventId = query.get("eventId");

  useEffect(() => {
    async function fetchEvent(id) {
      const detailsResponse = await fetch(
        `${dataPathWithUserId}/workout-${id}-details.json`
      );
      const details = await detailsResponse.json();
      const feedResponse = await fetch(
        `${dataPathWithUserId}/workout-${id}-feed-${details.feed_id}.json`
      );
      const feed = await feedResponse.json();
      const commentsResponse = await fetch(
        `${dataPathWithUserId}/workout-${id}-comments.json`
      );
      let comments;
      if (commentsResponse.status === 200) {
        const commentsJson = await commentsResponse.json();
        comments = commentsJson.data;
      } else {
        comments = feed.comments;
      }
      comments.reverse();
      setCurrentEvent({ details, feed, comments });
      calendar.current.getApi().gotoDate(new Date(details.local_start_time));
    }

    if (eventId) {
      fetchEvent(eventId);
    }
  }, [dataPathWithUserId, eventId]);

  async function datesSet(dates) {
    const year = dates.view.currentStart.getFullYear();
    monthPicker.current.setState({
      rawValue: {
        ...monthPicker.current.state.rawValue,
        year,
        month: dates.view.currentStart.getMonth() + 1,
      },
      yearIndexes: [
        monthPicker.current.state.years.findIndex((x) => x.year === year),
      ],
    });

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
        months.map(async (date) => {
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const data = await fetch(
            `${dataPathWithUserId}/history-${date.getFullYear()}-${month}.json`
          );
          if (data.status === 200) {
            return data.json();
          }
        })
      )
    )
      .flat()
      .filter((x) => x != null);

    setEvents(historyToEvents(history, dataPath, userId));
  }

  function changeMonth(year, month) {
    monthPicker.current.dismiss();
    calendar.current.getApi().gotoDate(new Date(year, month - 1));
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

  function getPictureUrl(picture) {
    return picture.url.replace("https://www.endomondo.com", dataPath);
  }

  function onKeyDownModal(event) {
    if (event.key === "ArrowLeft") {
      changePictureRelative(-1);
    } else if (event.key === "ArrowRight") {
      changePictureRelative(1);
    }
  }

  function eventClick(event) {
    event.jsEvent.preventDefault();
    history.push({
      search: `?dataPath=${dataPath}&userId=${userId}&eventId=${event.event.id}`,
    });
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ margin: "0 16px" }}>
        <h1>Activities from Endomondo</h1>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "stretch",
          }}
        >
          <MonthPicker
            ref={monthPicker}
            years={{ min: 2000 }}
            value={{ year: 2020, month: 12 }}
            lang={{
              months: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
              from: "From",
              to: "To",
            }}
            onChange={changeMonth}
          >
            <button
              type="button"
              style={{
                margin: 0,
                padding: 0,
                border: "unset",
                font: "unset",
                background: "unset",
                cursor: "pointer",
              }}
              onClick={() => monthPicker.current.show()}
            >
              <h2 style={{ height: "100%", margin: 0 }}>
                {monthAndYearFormat.format(
                  calendar.current?.getApi().getDate()
                )}
              </h2>
            </button>
          </MonthPicker>

          <div className="fc fc-media-screen fc-direction-ltr fc-theme-standard">
            <div className="fc-header-toolbar fc-toolbar ">
              <div className="fc-toolbar-chunk">
                <button
                  type="button"
                  className="fc-today-button fc-button fc-button-primary"
                  onClick={() => calendar.current.getApi().today()}
                >
                  today
                </button>
                <div className="fc-button-group">
                  <button
                    type="button"
                    className="fc-prev-button fc-button fc-button-primary"
                    aria-label="prev"
                    onClick={() => calendar.current.getApi().prev()}
                  >
                    <span className="fc-icon fc-icon-chevron-left"></span>
                  </button>
                  <button
                    type="button"
                    className="fc-next-button fc-button fc-button-primary"
                    aria-label="next"
                    onClick={() => calendar.current.getApi().next()}
                  >
                    <span className="fc-icon fc-icon-chevron-right"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FullCalendar
          ref={calendar}
          plugins={[dayGridPlugin]}
          firstDay={1}
          aspectRatio={1.8}
          initialDate="2020-12-31"
          initialView="dayGridMonth"
          events={events}
          eventClick={eventClick}
          datesSet={datesSet}
          headerToolbar={false}
        />

        {currentEvent && (
          <>
            <h2>{formatTime(currentEvent.details.local_start_time)}</h2>
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
                <a
                  key={picture.id}
                  href={getPictureUrl(picture)}
                  style={{
                    width: "calc(33.333333% - 16px)",
                    margin: "8px",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPicture(picture);
                  }}
                >
                  <img
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    src={getPictureUrl(picture)}
                    alt=""
                  />
                </a>
              ))}
            </div>

            <div style={{ margin: "16px 0" }}>
              <Map activity={currentEvent.details} />
            </div>

            {currentEvent.feed.tagged_with.length !== 0 && (
              <p>
                <strong>Tagged:</strong>{" "}
                {currentEvent.feed.tagged_with
                  .map((tag) => tag.name)
                  .join(", ")}
              </p>
            )}
            {currentEvent.feed.likes.length !== 0 && (
              <p>
                <strong>Likes:</strong>{" "}
                {currentEvent.feed.likes.map((tag) => tag.name).join(", ")}
              </p>
            )}

            {currentEvent.comments.length !== 0 && (
              <>
                <h4 style={{ marginBottom: 0 }}>Comments:</h4>
                {currentEvent.comments.map((comment) => (
                  <p key={comment.id}>
                    <strong>{comment.author.name}</strong> (
                    {formatTime(comment.timestamp)}):
                    <br />
                    {comment.text}
                  </p>
                ))}
              </>
            )}

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
                  src={currentPicture ? getPictureUrl(currentPicture) : null}
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
