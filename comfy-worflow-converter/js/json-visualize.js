// This function iterates over each first-level JSON node and renders it as a Bootstrap card.
function renderJsonCards(jsonObj) {
  var container = document.getElementById("cards-container");
  container.innerHTML = ""; // Clear previous content

  for (var node in jsonObj) {
    if (jsonObj.hasOwnProperty(node)) {
      var nodeData = jsonObj[node];
      var title = (nodeData._meta && nodeData._meta.title) ? nodeData._meta.title : "";
      var cardHeader = node + ": " + title;
      
      // Build list items for each input in the node
      var inputs = nodeData.inputs;
      var listItemsHtml = "";
      if (inputs) {
        for (var key in inputs) {
          if (inputs.hasOwnProperty(key)) {
            var value = inputs[key];
            // If value is an array, use only its first element
            if (Array.isArray(value)) {
              value = value[0];
            }
            
            // Determine icon and list-group class based on key and value
            var iconHtml = '';
            var listItemClass = "list-group-item"; // default
            if (key.toLowerCase() === "text") {
              iconHtml = '<i class="bi bi-card-text"></i>';
              listItemClass += " list-group-item-success";
            } else if (key.toLowerCase() === "seed") {
              // Use corrected dice icon; default type forced to Number
              iconHtml = '<i class="bi bi-dice-5-fill"></i>';
              listItemClass += " list-group-item-warning";
            } else if (key.toLowerCase() === "image") {
              iconHtml = '<i class="bi bi-image"></i>';
              listItemClass += " list-group-item-warning";
            } else if (key.toLowerCase() === "url") {
              iconHtml = '<i class="bi bi-globe"></i>';
              listItemClass += " list-group-item-success";
            } else if (typeof value === "number") {
              iconHtml = '<i class="bi bi-123"></i>';
              listItemClass += " list-group-item-info";
            } else {
              // Use dash icon as default
              iconHtml = '<i class="bi bi-dash"></i>';
            }
            
            // Determine default dropdown type:
            // Force "seed" to default Number; if value is a number then Number; if key "image" then Image; else String.
            var defaultType = "String";
            if (key.toLowerCase() === "seed") {
              defaultType = "Number";
            } else if (typeof value === "number") {
              defaultType = "Number";
            } else if (key.toLowerCase() === "image") {
              defaultType = "Image";
            }
            
            // Extra options now include: a persist checkbox, a type dropdown, and a text input (150px wide) defaulted to the key.
            var extraOptionsHtml = '<div class="extra-options">' +
                                     '<input type="checkbox" class="persist-checkbox mr-2">' +
                                     '<select class="type-dropdown form-control form-control-sm">' +
                                       '<option value="Number"' + (defaultType === "Number" ? " selected" : "") + '>Number</option>' +
                                       '<option value="String"' + (defaultType === "String" ? " selected" : "") + '>String</option>' +
                                       '<option value="Image"' + (defaultType === "Image" ? " selected" : "") + '>Image</option>' +
                                     '</select>' +
                                     '<input type="text" class="label-input form-control form-control-sm ml-2" style="width: 150px;" value="' + key + '">' +
                                   '</div>';
            
            // Include data attributes for node and key; the item-content takes remaining space.
            listItemsHtml += '<li class="' + listItemClass + ' d-flex justify-content-between align-items-center" data-node="' + node + '" data-key="' + key + '">' +
                               '<div class="item-content" style="flex: 1;">' + iconHtml + ' <strong>' + key + '</strong>: ' + value + '</div>' +
                               extraOptionsHtml +
                             '</li>';
          }
        }
      }
      
      // Build the card HTML with an H3 header.
      var cardHtml = '<div class="card mb-3">' +
                       '<div class="card-header"><h3>' + cardHeader + '</h3></div>' +
                       '<div class="card-body">' +
                         '<ul class="list-group list-group-flush">' + listItemsHtml + '</ul>' +
                       '</div>' +
                     '</div>';
      
      container.innerHTML += cardHtml;
    }
  }
}
