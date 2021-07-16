<h1 align="center">Topology Transformer</h1>

![image](https://user-images.githubusercontent.com/45873379/126004318-3868bd95-25cf-4d81-b6af-8a5a829a1c61.png)
## Codebase walkthrough

[![Code walkthrough](https://res.cloudinary.com/marcomontalbano/image/upload/v1626464193/video_to_markdown/images/google-drive--1Axpt8DSORJFQTJUQD2MArbNmZmh4SGGn-c05b58ac6eb4c4700831b2b3070cd403.jpg)](https://drive.google.com/file/d/1Axpt8DSORJFQTJUQD2MArbNmZmh4SGGn/view "Code walkthrough")

## Demo

Lets take a look at topologies already present in FMC.
![initial](https://user-images.githubusercontent.com/45873379/126001658-52e03ae1-ff6f-4ca5-92cc-843774103b43.png)
We have five point-to-point topologies and a single hub-and-spoke topology. Lets now try to merge those topologies using the tool. We need to first provide the FMC credentials.
![login](https://user-images.githubusercontent.com/45873379/126001700-8f35a39e-3938-49c8-87d4-43861aaed4f0.PNG)
Then we need to select the domain we want to manage.
![domain](https://user-images.githubusercontent.com/45873379/126001732-1f9eb835-b1a4-4907-ba62-25247ab338b5.PNG)
It now asks if we want to merge the topologies in a new hub-and-spoke topology or an existing one.
![choice](https://user-images.githubusercontent.com/45873379/126001717-b2df8842-0d2e-4209-b704-8999e4343d80.PNG)
Lets first merge into a new topology. We need to choose the hub device for our topology.
![device](https://user-images.githubusercontent.com/45873379/126001730-5ed88236-e358-461d-a113-63151fceba58.PNG)
The tool analyses the point-to-point topologies and find the ones containing our choosen device as an endpoint. We can now use the powerful filters to choose the exact topologies we want to merge.
![filter](https://user-images.githubusercontent.com/45873379/126001693-fd73fc80-8fe6-4bd9-9cb3-7090f43a6b6a.png)
Oops, we have a conflict! Lets manually resolve the _Interval seconds_ by selecting `40` and leave the preshared-key to the defaults.
![conflict](https://user-images.githubusercontent.com/45873379/126001722-632fc532-75ef-44ca-9b1a-003a486369dc.PNG)
Voila! The tool has created a new merged hub-and-spoke topology. We can take a look at the merged parameters as well.
![merged](https://user-images.githubusercontent.com/45873379/126001703-698953ab-5dbd-4649-b5ff-8376087b3242.PNG)
The FMC now displays a new topology with all the merged endpoints. Shall we deploy changes to device? Why not!
![merged_fmc](https://user-images.githubusercontent.com/45873379/126001712-bc018725-66f4-4625-874a-9d65bbe6acfa.PNG)
First the merged point-to-point topologies are deleted and then the newly created hub-and-spoke topology is pushed to the FTD device.
![deployed](https://user-images.githubusercontent.com/45873379/126001729-0311da25-7546-4051-bc84-a657ec8d5dac.PNG)
But what if we wanted to merge into an existing topology? The tool got us covered! This time choose _existing topology_.
![choice](https://user-images.githubusercontent.com/45873379/126001717-b2df8842-0d2e-4209-b704-8999e4343d80.PNG)
Then choose the topology we want to merge into. Lets choose _test-hns-topology_ for now.
![choose_hns](https://user-images.githubusercontent.com/45873379/126001720-bf5a0fba-f1a1-4558-b645-7dd8bb7d63be.PNG)
Next steps are the same as before. At the end we will have a modified hub-and-spoke topology we chose earlier.
![merged_existing](https://user-images.githubusercontent.com/45873379/126001706-08158d67-51dd-4f39-b79f-5c869d7a9d23.PNG)
FMC shows the added endpoints as well!
![merged_existing_fmc](https://user-images.githubusercontent.com/45873379/126001709-bcd25c6c-a913-4ac9-b69c-07b8e934201d.PNG)
Now the merged topology can be deployed. Topology management is easy again ;)
<!--![progress](https://user-images.githubusercontent.com/45873379/126001715-91478610-1215-4eed-a4e3-54b99f9eeb7b.PNG)-->


## Future roadmap

* Extending the concept to mesh topologies.
* Add breadcrumbs to aid navigation UI.
* Generate a detailed report after deployment.
* Indicator for default values during conflict resolution.
