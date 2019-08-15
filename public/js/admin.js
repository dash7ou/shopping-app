const $divOfButtonDelete = document.querySelectorAll(".card__actions"); //get all div product
const $deleteButtons = []; //list of delete button

// get all delete button
$divOfButtonDelete.forEach(card => {
  const btn = card.children[3];
  $deleteButtons.push(btn);
});

//delete on click
$deleteButtons.forEach(btn => {
  btn.addEventListener("click", function() {
    const productID = btn.parentElement.querySelector("[name=productId]").value;
    const csrf = btn.parentElement.querySelector("[name=_csrf]").value;
    const productArticle = btn.parentElement.parentElement;
    fetch(`/admin/product/${productID}`, {
      method: "DELETE",
      headers: {
        "csrf-token": csrf
      }
    })
      .then(result => {
        return result.json();
      })
      .then(data => {
        console.log(data);
        productArticle.parentNode.removeChild(productArticle);
      })
      .catch(err => {
        console.log(err);
      });
  });
});
