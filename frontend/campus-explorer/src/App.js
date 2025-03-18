import './App.css';
import Echo from './components/echo';

function App() {

	return (
		<div className="App">
			<header>
				<h1>Course Explorer</h1>
			</header>

			<main>
				<div className="container">
					<section>
						<Echo />
					</section>
				</div>
			</main>
		</div>
	);
}

export default App;
