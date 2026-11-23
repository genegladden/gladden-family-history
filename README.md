# The Gladden Line

A living family-history site for the Gladden line, from Olivia Gene Gladden and Evan Elliot Gladden back to Wateree Creek in Fairfield County, South Carolina.

The pages are static. There is no server to run and no build step. Everything a visitor reads about the family comes from one file, [`data/family.json`](data/family.json).

The site is published at [https://genegladden.github.io/gladden-family-history/](https://genegladden.github.io/gladden-family-history/).

## Add a person

1. Open `data/family.json`.
2. Copy a generation block inside `"line"` and give it a new `id` (lowercase, hyphens, unique).
3. Put the new block where it belongs. The children stay at the top. Earlier generations go further down.
4. Commit the change to the `main` branch.

On an iPhone or iPad: open this repository on GitHub, tap `data/family.json`, tap the pencil, edit, and commit to `main`. A minute or two later the site updates. You do not need a computer.

A generation looks like this:

```json
{
  "id": "new-person",
  "kicker": "Generation 11",
  "short": "Short name",
  "title": "Full Name",
  "summary": "One or two sentences. This stays visible while the card is closed, so put any doubt here.",
  "confidence": "unproven",
  "placement": "spine",
  "people": [
    {
      "id": "new-person-full",
      "name": "Full Name",
      "living": false,
      "confidence": "unproven",
      "relation": "How this person sits on the line",
      "paragraphs": [
        "Only facts you can point to. If a link is not proven, say so."
      ],
      "sources": [
        "The record, the book and page, and the year."
      ]
    }
  ]
}
```

`confidence` must be `proven`, `probable`, or `unproven`.

`placement` is `spine` for the father-to-father line, or `beside` for someone who belongs near the line but is not the next father.

`short` is the name in the list of jumps at the top of the line.

To point at a place or a record already on the page, add `see`:

```json
"see": [
  { "label": "The deed", "href": "#record-deed-1786" }
]
```

The link must start with `#` and use only letters, numbers, and hyphens.

### Living people

Olivia, Evan, Gene, and Emily are living. For a living person set `"living": true` and do not add a birth date, an age, a street or city of residence, or a photograph.

The page will show only the name, the relation, an optional `birthplace`, and the sources. It ignores paragraphs, tradition, ages, addresses, and photos on a living person, even if those fields are filled in. Gene's birthplace, Groves, Texas, is the one place included for him. Leave `birthplace` off everyone else who is living.

### A tradition

If a story was told in the family and is not a record, put it in `tradition` and label it. It renders as a quotation, separate from the sources.

```json
"traditionLabel": "Family tradition, from the person who told it",
"tradition": "The words of the tradition, and nothing beyond them."
```

## Add a record image

1. Save the scan as a JPEG, about 1600 to 2200 pixels on the long side. A phone photo of a page is fine. Smaller files keep the site quick to open.
2. Put the file in `assets/records/`. Use a plain name such as `deed-1800.jpg`.
3. Add an object to the `"records"` array:

```json
{
  "id": "deed-1800",
  "title": "Short title",
  "caption": "What the page is, the book and page, and the year.",
  "src": "assets/records/deed-1800.jpg",
  "width": 1600,
  "height": 2000,
  "alt": "Describe the page for someone who cannot see it.",
  "wide": false
}
```

`src` must start with `assets/`. `wide: true` lets a landscape page span the gallery on a tablet. Width and height are the pixel size of the file you saved. They keep the page from jumping while the photograph loads.

## Add a place

Add an object to `"places"`:

```json
{
  "id": "new-place",
  "name": "Name of the place",
  "detail": "What the research actually says about it.",
  "lat": "34.45944",
  "lng": "-80.99417",
  "approximate": false
}
```

Keep `lat` and `lng` as strings, so the map link keeps the exact coordinates. The link opens Google Maps in satellite view.

If the pin is an estimate of a tract, set `"approximate": true` and add `estimateNote` saying the pin is not a surveyed corner. Parcel estimates on this site are marked Approximate.

## Look at the site on your own machine

From the project folder:

```bash
python3 -m http.server
```

Then open [http://localhost:8000](http://localhost:8000). Opening `index.html` directly will not load the family file.

## How publishing works

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes the repository with GitHub Actions (`actions/deploy-pages`).

In the repository settings, **Pages → Build and deployment → Source** must be **GitHub Actions**. After that, the live site is:

[https://genegladden.github.io/gladden-family-history/](https://genegladden.github.io/gladden-family-history/)

The first visit after a commit can take a minute. If the old page is still there, refresh.

## What not to add

Do not invent a person, a date, or a relationship to fill a gap. If the link is a choice, or only a compiler's suggestion, say so in the `summary`, which stays visible while the card is closed. Spell a name the way that record spells it.
