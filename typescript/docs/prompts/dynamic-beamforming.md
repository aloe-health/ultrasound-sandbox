Ok sweet. We've got a beamforming profile setup in @profile/ , which deals with generating profiles for a given angle, direction, focus depth,  etc.

Next I want to work on a real time simulation. 

We'll need a couple things:

A `Phased Array Config` interface
 - basically just contains array spacing, count
 - in the future possible geometry, but for now just assume linear

A `Phased Array Source` interface
 - the `phased array source` interface has basically one main method: getPhasedArrayInput(time: Time) ->  PhasedArrayInput (number[])
 - it tells the phased array what each element is reading at a given time

Next we have a `Phased Array Source Generator` interface
 - later this interface will be integrated into an actual simulation based on a pulse of the profiles.
 - for now, we'll just implement one generator, which is a point particle emitting full waves around as it travels away from the transducer, as though a beam of infinitely small width and no attenuation was sent forward and was constantly sending power back. It will be configurable with an angle. 
 - basically we'll have this generator, we'll be able to modify it with things like angles, speeds and stuff (specific to a generator, not included in the actual type interface), and then we'll call the method associated:

 - getSource(array: PhasedArrayConfig)
 - this will take the generator, take the array description, and generate a object that conforms to the PhasedArraySource 

Lastly we have our
`DynamicBeamformer` 
 - takes in data from the PhasedArrayInput and outputs a beamformed version. Importantly the beamformers will likely process one sample at a time, but will need to see much of the data before providing an output. 
 - contains a parameter for timestep
 - has basically one big method as well: 

 beamform(input: PhasedArrayInput[] (number[][], with each PhasedArrayInput corresponding to the input at t=index * beamformer.timestep), ) -> BeamformOutput, which 