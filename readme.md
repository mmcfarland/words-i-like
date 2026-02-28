# Words I like

Words I like is a modern web application that allows users to create, manage, and share their favorite words. It provides a simple and intuitive interface for users to add new words, categorize them, and view definitions, and usage examples.

## Getting Started (Backend Preview)

The backend scaffold and PostgreSQL stack land in Phase 1B. Follow [`docs/development.md`](docs/development.md) for instructions on generating environment files, starting the Dockerized database, applying Prisma migrations, and running the Fastify dev server.

## Features

- Add new words with definitions and examples
- Categorize words into custom lists
- Search and filter words by category or keyword
- Share word lists with others via unique links
- Responsive design for mobile and desktop
- User authentication and profile management (via OAuth, primarily Google)
- Dark mode support
- Export word lists to CSV or JSON format
- Import words from CSV or JSON files
- Integration with dictionary APIs for automatic definitions
- Offline access to word lists via Progressive Web App (PWA) features

## Design ideas

- Clean and minimalistic user interface
This is a somewhat rambling. Idea for the look and feel of the site. . And
also some of the user experience I would like. . The main goal is that
users would want to. Quickly be able to. Add a new word. To their account.
. It shouldn't make you log in first. It shouldn't make you select a list
to add it to ,those should both be secondary actions. I imagine that
mostly people will use this on their phone, so I want the design to be primarily
driven with that idea. The esthetic is super clean and minimal. And I
would like. The user actions to. Use. Smooth transition animations, ., for
example. When going to the site initially , The page should be ready to
accept input for a new word, . However, I don't want this just to be a
standard text box, I want it to be clear that the user can start typing
come up. But I don't want just a boring text box . I want a modern input.
Mechanism. . Hitting enter or the submit button, which also should be
interesting and probably just an icon. The word should. Transition. Down below
the input with. A definition that's looked up from a Free Dictionary API.
. I want to be using. An interesting type face for this. It should be
consistent throughout, yeah, and should use good. Font sizes for the right kind
of information hierarchy. Again, this is very minimalistic. . So after the
user enters the word, it shows below the input with the definition and there
should be A couple. Actions available at that stage. So. The. Word at this point
has been added to some default list. . The user could. Move this to a
named list. Or move it to a new list which the user would give a name in that
same flow . Additionally, the user should be able to generate some usage
examples. This will be from an AI service but will have to go through some
point. That I control so I can limit cost and abuse. The user should be able to
continue adding words in this fashion. With the previously. Added words showing
up below. And getting pushed down. Potentially this means that this view should
just be the default list , and all the words should be shown underneath it.
I think the concept should be that there is always a core. List. Per device
slash account. , and the words are essentially tagged with new lists,
. But that might be a implementation artifact ,. The user. Probably
should think in terms of actual lists and this default list if they choose not
to break it down into Custom lists.    

The other main use case would be users just want to look at the words and definitions they have. I think that they may prefer to simply browse or be presented with a random one. Or select a list. But we should afford a way to search for words. Both by actual word and forwards in the definition.  

## Architecture / Tech Stack

We'll use Typescript and modern front end tooling. We will need a back end because. I would like to control. User persistence. And access to. LLM output for generating usage examples. So we'll need a modern back end as well. Comma, which I would prefer to also be TypeScript and node JS. I'm not sure what the back end should run on, but it should use an Azure service. And. Part of the project will be developing the bicep templates to ensure that service. Is codified. I really want to prioritize a good development environment as well. This will be a progressive web app, so persistence should be local. Initially and if not logged in exclusively. But it should be sinking both writes and reads. With the back end based on the logged in account. I want that process to be seamless. Also, if a user has not ever logged in and has essentially a local version of. Their lists when they log in for the first time and create an account. I want that list fully synced to the back end. The user interface should. Indicate that the user is logged in or not, again in an iconic and minimal way. But it should also be. Clear that. If user is not logged in then these. Words are only available on their current device. 

Things to consider would be. Azure Functions or a minimal? And inexpensive. App Service. And a persistence layer. Perhaps with? Postgres or Cosmos DB. I work on the Postgres team, so that is maybe my preference. And we could potentially use Jason B columns. Because it's not fully relational. Designing the database will be part of this task. As well. 

Deployment should be done through Github Actions. And I would like. A staging and production version. In addition to the dev environment. Unit tests and end to end testing with playwright would also be great. 

Project style goals should be encoded in a copilot instructions mark down file for agents to use, and this includes good use of components. I like small. Components and using fluent UI. Although. I think we will do very customized styling for it. However, that is a UI react framework that I am familiar with, so I think I would still like to use that system instead of learning a new one. 

This is an initial description of the project and I will work with. Penn agents. Develop the full. Scope. Codify the entire project definition and. Do the entire development in a step by step phased approach. This includes things like Developing. Initial scripts. For linting and formatting using prettier. Type checking, compilation and building. These scripts should be done in a way that the agents can also use them to ensure that their changes are. Correct and good. 
