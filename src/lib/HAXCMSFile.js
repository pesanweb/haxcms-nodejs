const path = require('path');
const fs = require('fs-extra');
const { HAXCMS } = require('./HAXCMS.js');
const mime = require('mime');
const sharp = require('sharp');
// a site object
class HAXCMSFile
{
  /**
   * Save file into this site, optionally updating reference inside the page
   */
  async save(tmpFile, site, page = null, imageOps = null)
  { 
    var returnData = {};
    // check for a file upload
    if (tmpFile['path']) {
      // get contents of the file if it was uploaded into a variable
      let filedata = tmpFile['path'];
      let pathPart = site.siteDirectory + '/files/';
      // ensure this path exists
      if (!fs.existsSync(pathPart)) {
        fs.mkdirSync(pathPart);
      }
      // ensure name does not exist already
      if (await fs.existsSync(path.join(pathPart, tmpFile.name))) {
        tmpFile.name = tmpFile.filename + '-' + tmpFile.originalname;
      }
      tmpFile.name = tmpFile.name.replace(/[/\\?%*:|"<>\s]/g, '-');
      let fullpath = pathPart + tmpFile['name'];
      try {
        await fs.moveSync(filedata, fullpath);
      }
      catch(err) {
        console.warn(err);
        return {
          status: 500
        };
      }
      //@todo make a way of defining these as returns as well as number to take
      // specialized support for images to do scale and crop stuff automatically
      if (['image/png',
        'image/jpeg',
        'image/gif'
        ].includes(mime.getType(fullpath))
      ) {
        // ensure folders exist
        // @todo comment this all in once we have a better way of doing it
        // front end should dictate stuff like this happening and probably
        // can actually accomplish much of it on its own
        /*try {
            fs.mkdir(path + 'scale-50');
            fs.mkdir(path + 'crop-sm');
        } catch (IOExceptionInterface exopenapiception) {
            echo "An error occurred while creating your directory at " +
                exception.getPath();
        }
        image = new ImageResize(fullpath);
        image
            .scale(50)
            .save(path + 'scale-50/' + upload['name'])
            .crop(100, 100)
            .save(path + 'crop-sm/' + upload['name']);*/
        // fake the file object creation stuff from CMS land
        returnData = {
          'file': {
            'path': path + tmpFile['name'],
            'fullUrl':
                HAXCMS.basePath +
                pathPart +
                tmpFile['name'],
            'url' : 'files/' + tmpFile['name'],
            'type' : mime.getType(fullpath),
            'name' : tmpFile['name'],
            'size' : tmpFile['size']
          }
        };
      }
      else {
        // fake the file object creation stuff from CMS land
        returnData = {
            'file':{
                'path':path + tmpFile['name'],
                'fullUrl' :
                    HAXCMS.basePath +
                    pathPart +
                    tmpFile['name'],
                'url': 'files/' + tmpFile['name'],
                'type': mime.getType(fullpath),
                'name': tmpFile['name'],
                'size': tmpFile['size']
            }
        };
      }
      // perform page level reference saving if available
      if (page != null) {
        // now update the page's metadata to suggest it uses this file. FTW!
        if (!(page.metadata.files)) {
          page.metadata.files = [];
        }
        page.metadata.files.push(returnData['file']);
        await site.updateNode(page);
      }
      // perform scale / crop operations if requested
      if (imageOps != null) {
        switch (imageOps) {
          case 'thumbnail':
            const image = await sharp(fullpath)
            .metadata()
            .then(({ width }) => sharp(fullpath)
              .resize({
                width: 250,
                height: 250,
                fit: sharp.fit.cover,
                position: sharp.strategy.entropy
              })
              .toFile(fullpath)
            );
          break;
        }
      }
      return {
          'status': 200,
          'data': returnData
      };
    }
  }
}

module.exports = HAXCMSFile;