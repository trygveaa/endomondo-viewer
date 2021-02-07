import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Workouts from "./Workouts";
import "./App.css";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/">
          <Workouts />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
