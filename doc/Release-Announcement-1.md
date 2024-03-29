Hello!

I'm happy to give you and the other testers the first working, testable version of my map making tool designed for authors and storytellers. The map making tool is currently usable to make rudimentary maps, with more improvements on the way--and your feedback is important!

You can download it here: [https://github.com/mapper1024/mapper1024/blob/master/DOWNLOAD.md#download-options](https://github.com/mapper1024/mapper1024/blob/master/DOWNLOAD.md#download-options)

You can use the online demo here: [https://mapper1024.github.io/demo](https://mapper1024.github.io/demo)

[![A screenshot of the sample map in the mapping tool](https://mapper1024.github.io/screenshots/sample_map_2022_07_30.thumb.png)](https://mapper1024.github.io/screenshots/sample_map_2022_07_30.png)

If you have any feedback, questions, or need help running the mapping tool, please let me know!

Brief Summary
-------------
The map making tool for authors and storytellers is in the functional prototype stage and ready for you to test. I need your feedback, input, and comments to decide what features to add, how to fix problems, and how to continue evolving the tool.

Quickstart
----------
Using the [download](https://github.com/mapper1024/mapper1024/blob/master/DOWNLOAD.md#download-options) link, you can choose an option for your computer. If you can't or don't want to download the program, just use the [online demo](https://mapper1024.github.io/demo) (currently the live demo works best in Chrome or Edge, Firefox struggles). You do need a computer for this, mobile devices are not yet supported.

When you first run the mapping tool, it will load the sample map. You can play around with the sample map, or make your own maps (*Ctrl+N* in the app, or *Shift+N* in the live demo). All the controls are displayed in the top left corner of the program for now, so you can look there to see what actions you can take.

The most basic controls:

* To add stuff to the map: *left-click* and drag.
* To change what you're adding to the map, hold *W* and *scroll* with your mouse or trackpad.
* To move around the map: *right-click* and drag.
* To zoom in or out: *scroll* with your mouse or trackpad.

If you want to delete stuff from the map, press *D* to switch to the delete brush and just *left-click* and drag.
If you want to go back to adding stuff to the map, press *A*.

In this prototype version of the program you can put forests, grasslands, bodies of water, rocky terrain, roadways, and representations of buildings on the map. Change what you are placing by holding *W* and *scrolling* the mouse or trackpad. Change the sizes of what you are placing by holding *Q* and *scrolling* the mouse or trackpad. You can name the things you place on the map with *N*.

If you are using the desktop app, you can save your map with *Ctrl+S*, or you can load a saved map with *Ctrl+O*. In the live demo, you can save with *Shift+S*, or you can load a saved map with *Shift+O*.

Future plans
------------
This version of the mapping tool is a prototype. The graphics rendered--what the map looks like on screen--are very simplistic and provide a stylized pixel-based representation of the map objects. The controls are barebones, albiet functional. Some parts of the program are slow due to naive algorithms, though fast enough to be usable.

Future versions of the mapping tool will provide better graphics. The underlying system already supports higher-quality graphics but code will need to be added to actually draw more realistic, smoother, or otherwise better maps. Future versions will also have more user-friendly controls and more options for crafting maps exactly as you intend. Future versions will optimize performance for more hardware and platforms for a smooth experience.

To build the fully-featured mapping tool, I need **your** help.

How you can help
----------------
What do **you** want the mapping tool to be? Your input will decide how the mapping tool works and looks. This prototype is a base for future development. Your testing and suggestions are needed to determine what needs changed, added, or removed.

Use this first version of the tool to make some maps. Maybe map out a story idea, or just play around with the sample map. You'll see what you like, what you don't like, and what needs to be changed or improved.

Think of what else you want from a mapping tool. What features do you want? Do you want coniferous forests for your story set in northern Canada? Would you prefer menus over keyboard shortcuts? Do you need a map at the level of city streets for your roleplaying adventure? Do you want the program to work better with your computer? Would you prefer the water to be animated? Do you want a way to measure distance between two mountains on the map for plotting your airship novel?

**Please let me know what you think and what you want**. I will file your suggestions and requests, prioritize them, and improve the mapping tool. As development progresses, I will release more development versions for you and the rest of the testers to test, and you can see how the mapping tool is progressing and give your feedback again on what needs changed, added, and improved.

Through this release-feedback-release cycle, the mapping tool will become software built to fit your needs as best it can. If you have any questions, please let me know!

And do you have any name suggestions for the project? I would love to hear them!

Technical details
-----------------
The source code for the mapping tool is hosted at [https://github.com/mapper1024/mapper1024](https://github.com/mapper1024/mapper1024).

Quick facts: The mapping tool is...

* Written primarily in *Javascript*
* Designed as a component that can be *embedded* in other websites, as well as used as a standalone program.
* Built using the *[SQLite](https://sqlite.org)* database engine to store the maps.
* Composed of well over *4000* lines of code.

You can read more about the technical implementation details in the [development journal](https://github.com/mapper1024/mapper1024/blob/master/doc/Development-Journal.md#functional-prototype-summer-2022).
